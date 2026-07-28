"""Business rules for tasks, compliance, audit, and statutory filings."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    AUDIT_TRANSITIONS,
    GST_DUE_DAY,
    GST_RETURN_TRANSITIONS,
    TASK_TRANSITIONS,
    TAX_RETURN_TRANSITIONS,
)
from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.permissions import Action, Module, Role
from app.core.security import AuthContext
from app.models.operations import (
    Audit,
    AuditChecklistItem,
    AuditObservation,
    ComplianceCalendarEntry,
    ComplianceType,
    GstReturn,
    Task,
    TaskAssignment,
    TaxReturn,
)
from app.repositories.clients import ClientEntityRepository, ClientRepository, ServiceRepository
from app.repositories.identity import BranchRepository, EmployeeRepository
from app.repositories.operations import (
    AuditChecklistRepository,
    AuditObservationRepository,
    AuditRepository,
    ComplianceCalendarRepository,
    ComplianceTypeRepository,
    GstReturnRepository,
    TaskRepository,
    TaxReturnRepository,
)
from app.services.base import BaseService
from app.utils.dates import assessment_year

# Statuses that only a partner may set. Encodes the documented approval chain.
PARTNER_ONLY_TASK_STATUSES = frozenset({"partner_approval"})
PARTNER_ONLY_AUDIT_STATUSES = frozenset({"final_approved"})


class TaskService(BaseService[Task, TaskRepository]):
    module = Module.TASKS
    transitions = TASK_TRANSITIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session
        if await ClientRepository(session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        if await BranchRepository(session).get(data["branch_id"]) is None:
            raise NotFoundError("Branch", data["branch_id"])
        if data.get("due_date") and data["due_date"] < date.today():
            raise ValidationError("A task cannot be created with a due date in the past.")
        return data

    async def _before_update(self, entity: Task, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        new_status = data.get("status")
        # Regular staff must route a task through the approval chain before it can
        # be completed; admins/managing partners may close it out directly from
        # the dashboard quick actions (the transition table already permits it).
        if (
            new_status == "done"
            and entity.status not in ("partner_approval", "client_approval")
            and not auth.is_admin
        ):
            raise ConflictError("A task must clear approval before it can be completed.")
        return data

    async def assign(self, task_id: UUID, assignment: dict[str, Any], auth: AuthContext) -> TaskAssignment:
        """Attach an assignee, reviewer, or approver to a task."""
        self._require(auth, Action.UPDATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may be assigned to tasks.")

        task = await self.repo.get_scoped_or_404(task_id, auth)

        employee = await EmployeeRepository(self.repo.session).get(assignment["employee_id"])
        if employee is None:
            raise NotFoundError("Employee", assignment["employee_id"])

        for existing in await self.repo.assignments_for(task_id):
            if existing.employee_id == employee.id and existing.role == assignment["role"]:
                raise AlreadyExistsError("This employee already holds that role on the task.")

        record = TaskAssignment(
            task_id=task.id,
            employee_id=employee.id,
            role=assignment["role"],
            assigned_at=datetime.now(timezone.utc),
            status="pending",
            created_by=auth.user_id,
        )
        self.repo.session.add(record)
        await self.repo.session.flush()

        # Picking up work moves a fresh task out of the backlog.
        if task.status in ("backlog", "todo"):
            await self.repo.update(task, {"status": "in_progress"}, actor_id=auth.user_id)
        return record

    async def my_tasks(self, auth: AuthContext, *, open_only: bool = True) -> list[Task]:
        self._require(auth, Action.READ)
        if auth.employee_id is None:
            raise ForbiddenError("No employee profile is linked to this account.")
        return await self.repo.assigned_to_employee(auth.employee_id, open_only=open_only)

    async def board_summary(self, auth: AuthContext) -> dict[str, int]:
        self._require(auth, Action.READ)
        return await self.repo.status_counts(None if auth.is_admin else auth.branch_id)

    async def workload(self, auth: AuthContext) -> dict[str, int]:
        self._require(auth, Action.READ)
        return await self.repo.workload_by_employee(None if auth.is_admin else auth.branch_id)


class ComplianceTypeService(BaseService[ComplianceType, ComplianceTypeRepository]):
    module = Module.COMPLIANCE


class ComplianceCalendarService(BaseService[ComplianceCalendarEntry, ComplianceCalendarRepository]):
    module = Module.COMPLIANCE
    transitions = {
        "pending": {"filed", "overdue", "waived"},
        "overdue": {"filed", "waived"},
        "filed": set(),
        "waived": {"pending"},
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session
        if await ClientRepository(session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        if await ComplianceTypeRepository(session).get(data["compliance_type_id"]) is None:
            raise NotFoundError("Compliance type", data["compliance_type_id"])

        if await self.repo.duplicate_exists(
            data["client_id"], data["compliance_type_id"], data["tax_year"], data.get("period")
        ):
            raise AlreadyExistsError("This compliance obligation is already on the calendar.")
        return data

    async def upcoming(
        self, auth: AuthContext, *, start: date, end: date, client_id: UUID | None = None
    ) -> list[ComplianceCalendarEntry]:
        self._require(auth, Action.READ)
        if auth.is_client:
            client_id = auth.client_id
        return await self.repo.due_between(start, end, client_id=client_id)

    async def refresh_overdue(self, auth: AuthContext) -> int:
        """Sweep pending items past their due date. Safe to run repeatedly."""
        self._require(auth, Action.UPDATE)
        return await self.repo.mark_overdue(date.today())


class AuditService(BaseService[Audit, AuditRepository]):
    module = Module.AUDITS
    transitions = AUDIT_TRANSITIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session
        if await ClientRepository(session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        if await ServiceRepository(session).get(data["service_id"]) is None:
            raise NotFoundError("Service", data["service_id"])
        return data

    async def _before_update(self, entity: Audit, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        new_status = data.get("status")

        # Final sign-off is a partner responsibility, per the documented workflow.
        if new_status in PARTNER_ONLY_AUDIT_STATUSES and auth.role not in (
            Role.MANAGING_PARTNER, Role.SUPER_ADMIN,
        ):
            raise ForbiddenError("Only a Managing Partner may grant final audit approval.")

        # An audit cannot be signed off while findings remain open.
        if new_status in ("draft_prepared", "final_approved"):
            open_observations = await AuditObservationRepository(self.repo.session).open_count(entity.id)
            if new_status == "final_approved" and open_observations:
                raise ConflictError(
                    f"{open_observations} observation(s) remain unresolved.",
                    details={"open_observations": open_observations},
                )

        if new_status == "completed" and entity.status != "final_approved":
            raise ConflictError("An audit must be partner-approved before completion.")

        return data

    async def progress(self, audit_id: UUID, auth: AuthContext) -> dict[str, Any]:
        """Checklist completion and open findings, for the audit dashboard."""
        self._require(auth, Action.READ)
        audit = await self.repo.get_scoped_or_404(audit_id, auth)

        done, total = await AuditChecklistRepository(self.repo.session).completion(audit_id)
        open_observations = await AuditObservationRepository(self.repo.session).open_count(audit_id)

        return {
            "audit_id": str(audit.id),
            "status": audit.status,
            "risk_rating": audit.risk_rating,
            "checklist_completed": done,
            "checklist_total": total,
            "checklist_percent": round(done / total * 100, 1) if total else 0.0,
            "open_observations": open_observations,
            "ready_for_approval": total > 0 and done == total and open_observations == 0,
        }


class AuditChecklistService(BaseService[AuditChecklistItem, AuditChecklistRepository]):
    module = Module.AUDITS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await AuditRepository(self.repo.session).get(data["audit_id"]) is None:
            raise NotFoundError("Audit", data["audit_id"])
        return data

    async def _before_update(
        self, entity: AuditChecklistItem, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if data.get("status") in ("completed", "not_applicable"):
            if auth.employee_id is None:
                raise ForbiddenError("No employee profile is linked to this account.")
            data["verified_by"] = auth.employee_id
            data["verified_at"] = datetime.now(timezone.utc)
        return data


class AuditObservationService(BaseService[AuditObservation, AuditObservationRepository]):
    module = Module.AUDITS
    transitions = {
        "open": {"management_responded", "closed"},
        "management_responded": {"resolved", "open"},
        "resolved": {"closed", "open"},
        "closed": set(),
    }

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        audit = await AuditRepository(self.repo.session).get(data["audit_id"])
        if audit is None:
            raise NotFoundError("Audit", data["audit_id"])
        if audit.status in ("final_approved", "completed"):
            raise ConflictError("Observations cannot be added to a closed audit.")
        return data

    async def respond(self, observation_id: UUID, text: str, auth: AuthContext) -> Any:
        """Record a management response. Both the client and staff may respond."""
        from app.models.operations import AuditResponse

        observation = await self.repo.get_or_404(observation_id)
        audit = await AuditRepository(self.repo.session).get(observation.audit_id)
        if audit is None:
            raise NotFoundError("Audit", observation.audit_id)
        if auth.is_client and audit.client_id != auth.client_id:
            raise NotFoundError("Observation", observation_id)
        if observation.status == "closed":
            raise ConflictError("This observation is closed and no longer accepts responses.")

        response = AuditResponse(
            observation_id=observation_id,
            responder_id=auth.user_id,
            response_text=text,
            responded_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )
        self.repo.session.add(response)

        if observation.status == "open":
            await self.repo.update(observation, {"status": "management_responded"}, actor_id=auth.user_id)
        await self.repo.session.flush()
        return response


class TaxReturnService(BaseService[TaxReturn, TaxReturnRepository]):
    module = Module.TAX
    transitions = TAX_RETURN_TRANSITIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        session = self.repo.session

        entity = await ClientEntityRepository(session).get(data["entity_id"])
        if entity is None:
            raise NotFoundError("Client entity", data["entity_id"])
        if entity.client_id != data["client_id"]:
            raise ValidationError("The entity does not belong to the specified client.")
        if not entity.pan:
            raise ValidationError("This entity has no PAN on file; a return cannot be prepared.")

        if await self.repo.duplicate_exists(
            data["entity_id"], data["financial_year"], data["return_type"]
        ):
            raise AlreadyExistsError("A return of this type already exists for that financial year.")

        # Derived, never accepted from the caller.
        data["assessment_year"] = assessment_year(data["financial_year"])
        data.setdefault("status", "received")
        return data

    async def _before_update(
        self, entity: TaxReturn, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if data.get("status") == "return_filed":
            if entity.calculated_tax_liability is None:
                raise ConflictError("The tax liability must be computed before filing.")
            data.setdefault("filed_at", datetime.now(timezone.utc))

        if data.get("status") == "acknowledgement_received" and not (
            data.get("acknowledgement_url") or entity.acknowledgement_url
        ):
            raise ConflictError("An acknowledgement document is required at this stage.")
        return data


class GstReturnService(BaseService[GstReturn, GstReturnRepository]):
    module = Module.GST
    transitions = GST_RETURN_TRANSITIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        entity = await ClientEntityRepository(self.repo.session).get(data["entity_id"])
        if entity is None:
            raise NotFoundError("Client entity", data["entity_id"])
        if entity.client_id != data["client_id"]:
            raise ValidationError("The entity does not belong to the specified client.")
        if not entity.gst_number:
            raise ValidationError("This entity has no GSTIN on file; a return cannot be prepared.")

        if await self.repo.duplicate_exists(
            data["entity_id"], data["period_year"], data.get("period_month"), data["return_type"]
        ):
            raise AlreadyExistsError("A return of this type already exists for that period.")

        data.setdefault("status", "received")
        return data

    async def _before_update(
        self, entity: GstReturn, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if data.get("status") == "return_filed":
            if entity.liability_amount is None:
                raise ConflictError("The GST liability must be computed before filing.")
            data.setdefault("filed_at", datetime.now(timezone.utc))
        return data

    @staticmethod
    def statutory_due_date(return_type: str, year: int, month: int | None) -> date:
        """Filing deadline for a period, from the statutory day-of-month table."""
        day = GST_DUE_DAY.get(return_type, 20)
        if month is None:
            # Annual returns are due on 31 December following the financial year.
            return date(year + 1, 12, 31)
        due_month = month + 1 if month < 12 else 1
        due_year = year if month < 12 else year + 1
        return date(due_year, due_month, day)

    async def reconcile(self, gst_return_id: UUID, auth: AuthContext) -> dict[str, Any]:
        """Compute net liability and any late fee for a return.

        Late fee follows the standard CGST+SGST daily rate, capped. The rate
        itself is statutory and stable; the amounts are recomputed here rather
        than trusted from the caller.
        """
        self._require(auth, Action.READ)
        gst_return = await self.repo.get_scoped_or_404(gst_return_id, auth)

        output_tax = gst_return.liability_amount or Decimal("0.00")
        itc = gst_return.input_tax_credit or Decimal("0.00")
        net = max(output_tax - itc, Decimal("0.00"))

        due = self.statutory_due_date(
            gst_return.return_type, gst_return.period_year, gst_return.period_month
        )
        filed_on = gst_return.filed_at.date() if gst_return.filed_at else date.today()
        days_late = max((filed_on - due).days, 0)

        # Nil returns attract a reduced daily fee.
        daily_rate = Decimal("20.00") if net == 0 else Decimal("50.00")
        late_fee = min(daily_rate * days_late, Decimal("5000.00"))

        if gst_return.late_fee_calculated != late_fee:
            await self.repo.update(
                gst_return, {"late_fee_calculated": late_fee}, actor_id=auth.user_id
            )

        return {
            "gst_return_id": gst_return.id,
            "output_tax": output_tax,
            "input_tax_credit": itc,
            "net_liability": net,
            "late_fee": late_fee,
            "days_late": days_late,
            "is_late": days_late > 0,
        }


def task_service(s: AsyncSession) -> TaskService:
    return TaskService(TaskRepository(s))


def compliance_type_service(s: AsyncSession) -> ComplianceTypeService:
    return ComplianceTypeService(ComplianceTypeRepository(s))


def compliance_calendar_service(s: AsyncSession) -> ComplianceCalendarService:
    return ComplianceCalendarService(ComplianceCalendarRepository(s))


def audit_service(s: AsyncSession) -> AuditService:
    return AuditService(AuditRepository(s))


def audit_checklist_service(s: AsyncSession) -> AuditChecklistService:
    return AuditChecklistService(AuditChecklistRepository(s))


def audit_observation_service(s: AsyncSession) -> AuditObservationService:
    return AuditObservationService(AuditObservationRepository(s))


def tax_return_service(s: AsyncSession) -> TaxReturnService:
    return TaxReturnService(TaxReturnRepository(s))


def gst_return_service(s: AsyncSession) -> GstReturnService:
    return GstReturnService(GstReturnRepository(s))
