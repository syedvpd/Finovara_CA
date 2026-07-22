"""Repositories for identity and organisation structure."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.models.identity import Branch, Employee, EmployeeBranchAccess, Role, User
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    model = Role
    searchable_fields = ("name", "code")
    sortable_fields = ("name", "code", "created_at")
    default_sort = "name"

    async def get_by_code(self, code: str) -> Role | None:
        return await self.get_by(code=code)


class UserRepository(BaseRepository[User]):
    model = User
    searchable_fields = ("first_name", "last_name", "email")
    sortable_fields = ("first_name", "last_name", "email", "status", "created_at")

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email)


class BranchRepository(BaseRepository[Branch]):
    model = Branch
    searchable_fields = ("name", "code", "address")
    sortable_fields = ("name", "code", "created_at")
    default_sort = "name"

    async def code_taken(self, code: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = self.base_query().where(Branch.code == code.upper())
        if exclude_id:
            stmt = stmt.where(Branch.id != exclude_id)
        return (await self.session.execute(stmt)).scalars().first() is not None


class EmployeeRepository(BaseRepository[Employee]):
    model = Employee
    searchable_fields = ("employee_code", "designation", "department")
    sortable_fields = ("employee_code", "designation", "department", "date_of_joining", "created_at")
    branch_column = "branch_id"

    async def get_by_user_id(self, user_id: UUID) -> Employee | None:
        return await self.get_by(user_id=user_id)

    async def accessible_branch_ids(self, employee_id: UUID) -> list[UUID]:
        """Home branch plus every explicitly granted branch."""
        employee = await self.get(employee_id)
        branches = {employee.branch_id} if employee else set()

        rows = await self.session.execute(
            select(EmployeeBranchAccess.branch_id).where(EmployeeBranchAccess.employee_id == employee_id)
        )
        branches.update(rows.scalars().all())
        return list(branches)

    async def grant_branch_access(self, employee_id: UUID, branch_ids: list[UUID]) -> None:
        existing = set(
            (
                await self.session.execute(
                    select(EmployeeBranchAccess.branch_id).where(
                        EmployeeBranchAccess.employee_id == employee_id
                    )
                )
            )
            .scalars()
            .all()
        )
        new_rows = [
            EmployeeBranchAccess(employee_id=employee_id, branch_id=b)
            for b in branch_ids
            if b not in existing
        ]
        if new_rows:
            self.session.add_all(new_rows)
            await self.session.flush()

    async def revoke_branch_access(self, employee_id: UUID, branch_id: UUID) -> None:
        row = (
            await self.session.execute(
                select(EmployeeBranchAccess).where(
                    EmployeeBranchAccess.employee_id == employee_id,
                    EmployeeBranchAccess.branch_id == branch_id,
                )
            )
        ).scalars().first()
        if row is not None:
            await self.session.delete(row)
            await self.session.flush()
