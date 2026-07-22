"""Website CMS, careers, downloads, contact form, and system settings.

The ``/public`` routes are deliberately unauthenticated: they serve the
marketing site. Everything they return is already public content.
"""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.permissions import Module
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.content import (
    AppSettingRead,
    AppSettingUpsert,
    BlogCreate,
    BlogRead,
    BlogUpdate,
    CareerApplicationRead,
    CareerApplicationUpdate,
    CareerCreate,
    CareerRead,
    CareerUpdate,
    ContactRequestCreate,
    ContactRequestRead,
    ContactRequestUpdate,
    DownloadCreate,
    DownloadRead,
    TestimonialCreate,
    TestimonialRead,
    TestimonialUpdate,
    WebsiteSettingRead,
    WebsiteSettingUpsert,
)
from app.services.cms import (
    app_setting_service,
    blog_service,
    career_application_service,
    career_service,
    contact_request_service,
    download_service,
    testimonial_service,
    website_setting_service,
)


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# --- Public (unauthenticated) ------------------------------------------------

public_router = APIRouter()


@public_router.get("/blogs", response_model=SuccessResponse[list[BlogRead]], summary="Published articles")
async def public_blogs(
    request: Request,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> SuccessResponse[list[BlogRead]]:
    posts = await blog_service(session).public_feed(limit)
    return SuccessResponse[list[BlogRead]](
        data=[BlogRead.model_validate(p) for p in posts], request_id=_rid(request)
    )


@public_router.get("/blogs/{slug}", response_model=SuccessResponse[BlogRead], summary="Read an article")
async def public_blog(request: Request, slug: str, session: DbSession) -> SuccessResponse[BlogRead]:
    post = await blog_service(session).public_by_slug(slug)
    return SuccessResponse[BlogRead](data=BlogRead.model_validate(post), request_id=_rid(request))


@public_router.get("/careers", response_model=SuccessResponse[list[CareerRead]], summary="Open vacancies")
async def public_careers(request: Request, session: DbSession) -> SuccessResponse[list[CareerRead]]:
    openings = await career_service(session).public_openings()
    return SuccessResponse[list[CareerRead]](
        data=[CareerRead.model_validate(c) for c in openings], request_id=_rid(request)
    )


@public_router.get(
    "/testimonials", response_model=SuccessResponse[list[TestimonialRead]], summary="Published testimonials"
)
async def public_testimonials(
    request: Request,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
) -> SuccessResponse[list[TestimonialRead]]:
    items = await testimonial_service(session).public_feed(limit)
    return SuccessResponse[list[TestimonialRead]](
        data=[TestimonialRead.model_validate(t) for t in items], request_id=_rid(request)
    )


@public_router.get("/downloads", response_model=SuccessResponse[list[DownloadRead]], summary="Public resources")
async def public_downloads(request: Request, session: DbSession) -> SuccessResponse[list[DownloadRead]]:
    items = await download_service(session).public_list()
    return SuccessResponse[list[DownloadRead]](
        data=[DownloadRead.model_validate(d) for d in items], request_id=_rid(request)
    )


@public_router.get(
    "/downloads/{download_id}/file",
    summary="Fetch a public resource",
    description="Redirects to a short-lived signed URL and counts the download.",
    response_class=RedirectResponse,
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
)
async def public_download_file(download_id: UUID, session: DbSession) -> RedirectResponse:
    url = await download_service(session).public_signed_url(download_id)
    return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@public_router.post(
    "/careers/{career_id}/apply",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for a vacancy",
    description="Unauthenticated. Accepts the applicant's details and their CV as "
    "multipart form data. The response is deliberately generic.",
)
async def apply_for_vacancy(
    request: Request,
    career_id: UUID,
    session: DbSession,
    resume: Annotated[UploadFile, File(description="CV, PDF or Word, up to 5 MB")],
    applicant_name: Annotated[str, Form(min_length=2, max_length=150)],
    applicant_email: Annotated[str, Form(max_length=320)],
    applicant_phone: Annotated[str, Form(max_length=20)],
    cover_letter: Annotated[str | None, Form(max_length=5000)] = None,
) -> MessageResponse:
    content = await resume.read()
    await career_application_service(session).submit_with_resume(
        {
            "career_id": career_id,
            "applicant_name": applicant_name.strip(),
            "applicant_email": applicant_email.strip().lower(),
            "applicant_phone": applicant_phone.strip(),
            "cover_letter": (cover_letter or "").strip() or None,
        },
        filename=resume.filename or "resume",
        content=content,
        content_type=resume.content_type or "application/octet-stream",
    )
    return MessageResponse(
        message="Thank you. Your application has been received and our team will be in touch.",
        request_id=_rid(request),
    )


@public_router.get(
    "/settings", response_model=SuccessResponse[dict[str, Any]], summary="Marketing site configuration"
)
async def public_settings(request: Request, session: DbSession) -> SuccessResponse[dict[str, Any]]:
    return SuccessResponse[dict[str, Any]](
        data=await website_setting_service(session).public_settings(), request_id=_rid(request)
    )


@public_router.post(
    "/contact",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit the contact form",
    description="Unauthenticated. Rate limited by the middleware; the response "
    "is deliberately generic so the endpoint cannot be used to probe the system.",
)
async def submit_contact(
    request: Request, payload: ContactRequestCreate, session: DbSession
) -> MessageResponse:
    await contact_request_service(session).submit(
        payload.model_dump(), ip_address=_client_ip(request)
    )
    return MessageResponse(
        message="Thank you. Your enquiry has been received and a consultant will be in touch.",
        request_id=_rid(request),
    )


# --- Managed content ---------------------------------------------------------


async def blog_filters(
    status: Annotated[str | None, Query(pattern="^(draft|scheduled|published)$")] = None,
    author_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "author_id": author_id}.items() if v}


blogs_router: APIRouter = build_crud_router(
    service_factory=blog_service,
    read_schema=BlogRead,
    create_schema=BlogCreate,
    update_schema=BlogUpdate,
    module=Module.CMS,
    resource_name="article",
    filter_dependency=blog_filters,
)


async def career_filters(
    status: Annotated[str | None, Query(pattern="^(open|closed)$")] = None,
    department: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "department": department}.items() if v}


careers_router: APIRouter = build_crud_router(
    service_factory=career_service,
    read_schema=CareerRead,
    create_schema=CareerCreate,
    update_schema=CareerUpdate,
    module=Module.CMS,
    resource_name="vacancy",
    filter_dependency=career_filters,
)


async def application_filters(
    career_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"career_id": career_id, "status": status}.items() if v}


applications_router: APIRouter = build_crud_router(
    service_factory=career_application_service,
    read_schema=CareerApplicationRead,
    create_schema=None,  # applications arrive through the public form
    update_schema=CareerApplicationUpdate,
    module=Module.CMS,
    resource_name="application",
    filter_dependency=application_filters,
    enable_delete=False,
)


downloads_router: APIRouter = build_crud_router(
    service_factory=download_service,
    read_schema=DownloadRead,
    create_schema=DownloadCreate,
    update_schema=None,
    module=Module.CMS,
    resource_name="download",
)


async def contact_filters(
    status: Annotated[str | None, Query(pattern="^(new|contacted|converted|closed|spam)$")] = None,
) -> dict[str, Any]:
    return {"status": status} if status else {}


contact_router: APIRouter = build_crud_router(
    service_factory=contact_request_service,
    read_schema=ContactRequestRead,
    create_schema=None,  # submissions arrive through the public endpoint
    update_schema=ContactRequestUpdate,
    module=Module.LEADS,
    resource_name="contact request",
    filter_dependency=contact_filters,
    enable_delete=False,
)


# --- Settings ----------------------------------------------------------------

settings_router = APIRouter()


@settings_router.get(
    "/website", response_model=SuccessResponse[list[WebsiteSettingRead]], summary="Website settings"
)
async def list_website_settings(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[WebsiteSettingRead]]:
    service = website_setting_service(session)
    rows, _ = await service.list(auth)
    return SuccessResponse[list[WebsiteSettingRead]](
        data=[WebsiteSettingRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


@settings_router.put(
    "/website", response_model=SuccessResponse[WebsiteSettingRead], summary="Set a website setting"
)
async def upsert_website_setting(
    request: Request, payload: WebsiteSettingUpsert, session: DbSession, auth: CurrentUser
) -> SuccessResponse[WebsiteSettingRead]:
    setting = await website_setting_service(session).upsert(payload.key, payload.value, auth)
    return SuccessResponse[WebsiteSettingRead](
        data=WebsiteSettingRead.model_validate(setting), request_id=_rid(request)
    )


@settings_router.get(
    "/system",
    response_model=SuccessResponse[list[AppSettingRead]],
    summary="System settings",
    description="Settings flagged sensitive are withheld from non-administrators.",
)
async def list_app_settings(
    request: Request, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[AppSettingRead]]:
    rows, _ = await app_setting_service(session).list(auth)
    return SuccessResponse[list[AppSettingRead]](
        data=[AppSettingRead.model_validate(r) for r in rows], request_id=_rid(request)
    )


@settings_router.put(
    "/system", response_model=SuccessResponse[AppSettingRead], summary="Set a system setting"
)
async def upsert_app_setting(
    request: Request, payload: AppSettingUpsert, session: DbSession, auth: CurrentUser
) -> SuccessResponse[AppSettingRead]:
    setting = await app_setting_service(session).upsert(payload.model_dump(), auth)
    return SuccessResponse[AppSettingRead](
        data=AppSettingRead.model_validate(setting), request_id=_rid(request)
    )


async def testimonial_filters(
    status: Annotated[str | None, Query(pattern="^(draft|published|archived)$")] = None,
    is_featured: Annotated[bool | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"status": status, "is_featured": is_featured}.items() if v is not None}


testimonials_router: APIRouter = build_crud_router(
    service_factory=testimonial_service,
    read_schema=TestimonialRead,
    create_schema=TestimonialCreate,
    update_schema=TestimonialUpdate,
    module=Module.CMS,
    resource_name="testimonial",
    filter_dependency=testimonial_filters,
)
