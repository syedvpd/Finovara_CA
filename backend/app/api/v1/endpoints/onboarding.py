"""Admin onboarding — provision a Supabase auth user plus a client/employee row.

Self-service signup is forced to the 'client' role and there is deliberately no
user-create API, so an admin cannot mint staff or client accounts through the
normal CRUD endpoints. This endpoint fills that gap for authenticated admins:
it creates the Supabase identity with the service-role key, waits for the
``handle_new_user`` trigger to lay down the profile row, then assigns the role
and creates the client/employee record — the same sequence as
``scripts/bootstrap_admin.py``. A raw asyncpg connection is used (as the pooled
``postgres`` role) to mirror that script exactly and stay clear of RLS scoping.
"""

from __future__ import annotations

import asyncio
import secrets
import string

import asyncpg
import httpx
from fastapi import APIRouter, Request, status
from pydantic import EmailStr, Field

from app.api.deps import AdminUser
from app.core.config import settings
from app.core.exceptions import AlreadyExistsError
from app.core.logging import get_logger
from app.schemas.common import APIModel, SuccessResponse

logger = get_logger(__name__)
router = APIRouter()


def _temp_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%_-"
    # Prefix guarantees the upper/lower/digit/symbol policy regardless of draws.
    return "Fv1@" + "".join(secrets.choice(alphabet) for _ in range(length))


def _dsn() -> str:
    # asyncpg wants a bare postgresql:// DSN; SQLAlchemy carries the +asyncpg driver.
    return settings.sqlalchemy_url.replace("postgresql+asyncpg://", "postgresql://")


async def _create_auth_user(email: str, password: str, full_name: str, *, reuse_existing: bool = True) -> str:
    """Create (or, for admin flows, reuse) the Supabase identity. Returns the user id.

    Public self-service registration passes ``reuse_existing=False`` so an
    already-registered email is rejected rather than re-provisioned — otherwise
    anyone could POST an existing account's email and downgrade it to a client.
    """
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    if not key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    first, _, last = full_name.partition(" ")
    headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base}/auth/v1/admin/users",
            headers=headers,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"first_name": first, "last_name": last or ""},
            },
        )
        if resp.status_code in (200, 201):
            return resp.json()["id"]
        if resp.status_code in (409, 422) or "already" in resp.text.lower():
            if not reuse_existing:
                raise AlreadyExistsError("An account with this email already exists. Please sign in instead.")
            listing = await client.get(
                f"{base}/auth/v1/admin/users", headers=headers, params={"page": 1, "per_page": 200}
            )
            for user in listing.json().get("users", []):
                if user.get("email", "").lower() == email.lower():
                    return user["id"]
        raise ValueError(f"Supabase user creation failed: HTTP {resp.status_code} {resp.text[:200]}")


async def _provision_client(
    conn: asyncpg.Connection, user_id: str, full_name: str,
    company_name: str | None, client_type: str, phone: str | None = None,
) -> str:
    """Assign the client role and create the clients + entity rows. Shared by the
    admin onboarding and the public self-service registration endpoints."""
    if not await _wait_for_profile(conn, user_id):
        raise ValueError("Profile row was not created (handle_new_user)")
    first, _, last = full_name.partition(" ")
    await conn.execute(
        "update public.users set role_id = (select id from public.roles where code = 'client'),"
        " first_name = $2, last_name = $3, phone = coalesce($4, phone), status = 'active' where id = $1",
        user_id, first, last or "", phone,
    )
    client_id = await conn.fetchval("select id from public.clients where user_id = $1", user_id)
    if not client_id:
        branch_id = await conn.fetchval("select id from public.branches order by code limit 1")
        client_id = await conn.fetchval(
            "insert into public.clients (user_id, branch_id, client_type, status)"
            " values ($1, $2, $3, 'active') returning id",
            user_id, branch_id, client_type,
        )
        await conn.execute(
            "insert into public.client_entities (client_id, legal_name, entity_type, registered_address)"
            " values ($1, $2, 'pvt_ltd', 'Hyderabad, Telangana, India')",
            client_id, company_name or full_name,
        )
    return str(client_id)


async def _wait_for_profile(conn: asyncpg.Connection, user_id: str) -> bool:
    # handle_new_user runs on a trigger, slightly behind the API call.
    for _ in range(20):
        if await conn.fetchval("select 1 from public.users where id = $1", user_id):
            return True
        await asyncio.sleep(0.3)
    return False


class ClientOnboard(APIModel):
    full_name: str
    email: EmailStr
    company_name: str | None = None
    client_type: str = "private_limited"


class EmployeeOnboard(APIModel):
    full_name: str
    email: EmailStr
    designation: str = "Staff"
    department: str = "Operations"
    role_code: str = "accountant"


class ClientRegister(APIModel):
    """Public self-service signup. Role is fixed to 'client' server-side."""

    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=72)
    company_name: str | None = None


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.post("/clients", status_code=status.HTTP_201_CREATED, summary="Onboard a client (auto-provisions the login)")
async def onboard_client(request: Request, payload: ClientOnboard, auth: AdminUser) -> SuccessResponse[dict]:
    password = _temp_password()
    user_id = await _create_auth_user(payload.email, password, payload.full_name)
    conn = await asyncpg.connect(_dsn(), statement_cache_size=0, timeout=30)
    try:
        client_id = await _provision_client(
            conn, user_id, payload.full_name, payload.company_name, payload.client_type
        )
    finally:
        await conn.close()
    logger.info("client_onboarded", client_id=str(client_id), by=str(auth.user_id))
    return SuccessResponse[dict](
        data={"client_id": str(client_id), "email": payload.email, "temporary_password": password},
        request_id=_rid(request),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Public self-service client signup")
async def register_client(request: Request, payload: ClientRegister) -> SuccessResponse[dict]:
    # No AdminUser dependency: this is intentionally public. Role is hard-coded
    # to 'client' inside _provision_client, so there is no privilege-escalation
    # path even though anyone can call it. reuse_existing=False stops a caller
    # from re-provisioning (and thus corrupting) an already-registered account.
    user_id = await _create_auth_user(
        payload.email, payload.password, payload.full_name, reuse_existing=False
    )
    conn = await asyncpg.connect(_dsn(), statement_cache_size=0, timeout=30)
    try:
        client_id = await _provision_client(
            conn, user_id, payload.full_name, payload.company_name, "private_limited", payload.phone
        )
    finally:
        await conn.close()
    logger.info("client_self_registered", client_id=client_id)
    return SuccessResponse[dict](
        data={"client_id": client_id, "email": payload.email}, request_id=_rid(request),
    )


@router.post("/employees", status_code=status.HTTP_201_CREATED, summary="Onboard an employee (auto-provisions the login)")
async def onboard_employee(request: Request, payload: EmployeeOnboard, auth: AdminUser) -> SuccessResponse[dict]:
    password = _temp_password()
    user_id = await _create_auth_user(payload.email, password, payload.full_name)
    conn = await asyncpg.connect(_dsn(), statement_cache_size=0, timeout=30)
    try:
        if not await _wait_for_profile(conn, user_id):
            raise ValueError("Profile row was not created (handle_new_user)")
        first, _, last = payload.full_name.partition(" ")
        role_id = await conn.fetchval("select id from public.roles where code = $1", payload.role_code)
        if role_id is None:
            raise ValueError(f"Unknown role_code '{payload.role_code}'")
        await conn.execute(
            "update public.users set role_id = $2, first_name = $3, last_name = $4, status = 'active' where id = $1",
            user_id, role_id, first, last or "",
        )
        employee_id = await conn.fetchval("select id from public.employees where user_id = $1", user_id)
        if not employee_id:
            branch_id = await conn.fetchval("select id from public.branches order by code limit 1")
            employee_id = await conn.fetchval(
                "insert into public.employees (user_id, branch_id, designation, department, date_of_joining)"
                " values ($1, $2, $3, $4, current_date) returning id",
                user_id, branch_id, payload.designation, payload.department,
            )
    finally:
        await conn.close()
    logger.info("employee_onboarded", employee_id=str(employee_id), by=str(auth.user_id))
    return SuccessResponse[dict](
        data={"employee_id": str(employee_id), "email": payload.email, "temporary_password": password},
        request_id=_rid(request),
    )
