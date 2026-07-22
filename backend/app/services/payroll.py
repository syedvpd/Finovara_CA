"""Payroll: statutory calculation and run processing.

No rate is hardcoded. PF, EPS, ESI, Professional Tax and TDS are all resolved
from ``payroll_statutory_config``, which is effective-dated and state-aware, so
a budget change is a data edit rather than a deployment.

Scope: calculation and payslip production only. This module performs no bank
transfer and holds no banking credentials.
"""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PAYROLL_RUN_TRANSITIONS
from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.finance import EmployeePayrollProfile, EmployeePayrollRecord, PayrollRun
from app.models.system import PayrollAttendance, PayrollStatutoryConfig
from app.repositories.clients import ClientRepository
from app.repositories.finance import (
    AttendanceRepository,
    PayrollProfileRepository,
    PayrollRunRepository,
    StatutoryConfigRepository,
)
from app.repositories.identity import BranchRepository
from app.repositories.system import AppSettingRepository
from app.services.base import BaseService
from app.utils.dates import financial_year
from app.utils.money import ZERO, money, percent_of, prorate, sum_money, whole_rupees

logger = get_logger(__name__)

#: Settings key holding the fallback state for Professional Tax.
DEFAULT_STATE_SETTING = "payroll.default_state_code"


class StatutoryCalculator:
    """Applies the configured statutory rates to one employee's monthly pay.

    Constructed once per payroll run so the configuration is read from the
    database a single time rather than per employee.
    """

    def __init__(self, configs: dict[str, PayrollStatutoryConfig | None]) -> None:
        self.configs = configs
        self.warnings: list[str] = []

    def _config(self, component: str) -> PayrollStatutoryConfig | None:
        config = self.configs.get(component)
        if config is None and component not in self.warnings:
            self.warnings.append(
                f"No active '{component}' configuration for this period; it was treated as nil."
            )
        return config

    def provident_fund(self, pf_wage: Decimal) -> tuple[Decimal, Decimal, Decimal]:
        """Returns (employee_share, employer_pf_share, employer_eps_share).

        The employer's total liability is split between the pension scheme
        (EPS) and the provident fund. Rounding each share independently can
        make them sum to one rupee more than the total actually owed, so the
        total and the EPS share are rounded and the PF share is taken as the
        remainder. The employer contribution then always reconciles.
        """
        pf = self._config("pf")
        if pf is None:
            return ZERO, ZERO, ZERO

        # PF is computed on wages capped at the statutory ceiling.
        capped = min(pf_wage, money(pf.wage_ceiling)) if pf.wage_ceiling else pf_wage

        employee = whole_rupees(percent_of(capped, money(pf.employee_rate or 0)))

        eps_config = self._config("eps")
        eps_rate = money(eps_config.employer_rate or 0) if eps_config else ZERO
        pf_rate = money(pf.employer_rate or 0)

        employer_total = whole_rupees(percent_of(capped, pf_rate + eps_rate))
        employer_eps = whole_rupees(percent_of(capped, eps_rate))
        employer_pf = money(employer_total - employer_eps)

        return employee, employer_pf, employer_eps

    def employee_state_insurance(self, gross: Decimal) -> tuple[Decimal, Decimal]:
        """ESI applies only at or below the wage ceiling."""
        esi = self._config("esi")
        if esi is None:
            return ZERO, ZERO
        if esi.wage_ceiling is not None and gross > money(esi.wage_ceiling):
            return ZERO, ZERO
        return (
            whole_rupees(percent_of(gross, money(esi.employee_rate or 0))),
            whole_rupees(percent_of(gross, money(esi.employer_rate or 0))),
        )

    def professional_tax(self, gross: Decimal) -> Decimal:
        """Slab lookup. Slabs are ``[{from, to, amount}]``; ``to: null`` is open-ended."""
        config = self._config("professional_tax")
        if config is None or not config.slabs:
            return ZERO

        for slab in config.slabs:
            lower = money(slab.get("from", 0))
            upper = slab.get("to")
            if gross >= lower and (upper is None or gross <= money(upper)):
                return whole_rupees(slab.get("amount", 0))
        return ZERO

    def tax_deducted_at_source(self, gross: Decimal, declared: Decimal) -> Decimal:
        """TDS.

        A figure declared on the employee's profile wins, because it reflects
        their investment declarations and other-income disclosures, which this
        system does not hold. Slabs are only a fallback.
        """
        if declared > ZERO:
            return whole_rupees(declared)

        config = self._config("tds")
        if config is None or not config.slabs:
            return ZERO

        annual = gross * 12
        for slab in config.slabs:
            lower = money(slab.get("from", 0))
            upper = slab.get("to")
            if annual >= lower and (upper is None or annual <= money(upper)):
                rate = money(slab.get("rate", 0))
                return whole_rupees(percent_of(annual, rate) / 12)
        return ZERO


class PayrollService(BaseService[PayrollRun, PayrollRunRepository]):
    module = Module.PAYROLL
    transitions = PAYROLL_RUN_TRANSITIONS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await BranchRepository(self.repo.session).get(data["branch_id"]) is None:
            raise NotFoundError("Branch", data["branch_id"])

        if await self.repo.period_exists(data["branch_id"], data["period_year"], data["period_month"]):
            raise AlreadyExistsError("A payroll run already exists for that branch and period.")

        period_start = date(data["period_year"], data["period_month"], 1)
        if period_start > date.today().replace(day=1):
            raise ValidationError("Payroll cannot be opened for a future period.")

        data.setdefault("status", "draft")
        return data

    async def _before_update(
        self, entity: PayrollRun, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        new_status = data.get("status")

        if new_status == "verified" and entity.status != "calculated":
            raise ConflictError("Payroll must be calculated before it can be verified.")

        if new_status == "paid":
            if entity.status != "verified":
                raise ConflictError("Payroll must be verified before it is marked paid.")
            if not auth.is_admin:
                raise ForbiddenError("Only an administrator may mark a payroll run paid.")
            data["processed_at"] = datetime.now(timezone.utc)
            if auth.employee_id:
                data["processed_by"] = auth.employee_id

        return data

    async def _resolve_state_code(self, client_id: UUID | None) -> str | None:
        """Professional Tax is state-specific; fall back to the configured default."""
        setting = await AppSettingRepository(self.repo.session).get_value(DEFAULT_STATE_SETTING)
        return setting if isinstance(setting, str) else None

    async def _load_configs(
        self, on: date, state_code: str | None
    ) -> dict[str, PayrollStatutoryConfig | None]:
        repo = StatutoryConfigRepository(self.repo.session)
        components = ("pf", "eps", "esi", "professional_tax", "tds")
        return {c: await repo.resolve(c, on, state_code=state_code) for c in components}

    async def calculate(
        self, run_id: UUID, auth: AuthContext, *, client_id: UUID | None = None
    ) -> dict[str, Any]:
        """Compute every payslip in a run.

        Idempotent: existing records for the run are discarded and recomputed,
        so a correction to attendance or a rate can simply be re-run.
        """
        self._require(auth, Action.UPDATE)
        run = await self.repo.get_scoped_or_404(run_id, auth)

        if run.status in ("verified", "paid"):
            raise ConflictError(
                f"This run is {run.status} and can no longer be recalculated. "
                "Reopen it first if a correction is needed."
            )

        period_end = _last_day_of_month(run.period_year, run.period_month)
        state_code = await self._resolve_state_code(client_id)
        calculator = StatutoryCalculator(await self._load_configs(period_end, state_code))

        profile_repo = PayrollProfileRepository(self.repo.session)
        attendance_repo = AttendanceRepository(self.repo.session)

        if client_id is not None:
            if await ClientRepository(self.repo.session).get(client_id) is None:
                raise NotFoundError("Client", client_id)
            profiles = await profile_repo.for_client(client_id)
        else:
            profiles, _ = await profile_repo.list(auth=auth)

        if not profiles:
            raise ConflictError("There are no payroll profiles to process for this run.")

        await self.repo.clear_records(run_id)

        breakdowns: list[dict[str, Any]] = []
        skipped: list[str] = []
        total_gross = total_deductions = total_net = total_employer = ZERO

        for profile in profiles:
            attendance = await attendance_repo.get_for_period(
                profile.id, run.period_year, run.period_month
            )
            if attendance is None:
                # Paying someone without attendance would be a guess.
                skipped.append(f"{profile.employee_name} ({profile.employee_code}): no attendance recorded")
                continue

            breakdown = self._compute_one(profile, attendance, calculator)
            breakdowns.append(breakdown)

            self.repo.session.add(
                EmployeePayrollRecord(
                    payroll_run_id=run.id,
                    employee_profile_id=profile.id,
                    attendance_days=breakdown["paid_days"],
                    lwp_days=breakdown["lwp_days"],
                    basic_salary_earned=breakdown["basic_salary_earned"],
                    gross_salary=breakdown["gross_salary"],
                    pf_deduction=breakdown["pf_employee"],
                    esi_deduction=breakdown["esi_employee"],
                    pt_deduction=breakdown["professional_tax"],
                    tds_deduction=breakdown["tds"],
                    other_deductions=breakdown["other_deductions"],
                    net_salary=breakdown["net_salary"],
                )
            )

            total_gross += breakdown["gross_salary"]
            total_deductions += breakdown["total_deductions"]
            total_net += breakdown["net_salary"]
            total_employer += breakdown["employer_cost"]

        if not breakdowns:
            raise ConflictError(
                "No employee had attendance recorded for this period.",
                details={"skipped": skipped},
            )

        await self.repo.update(
            run,
            {
                "status": "calculated",
                "total_gross": money(total_gross),
                "total_deductions": money(total_deductions),
                "total_net": money(total_net),
            },
            actor_id=auth.user_id,
        )

        logger.info(
            "payroll_calculated",
            run_id=str(run.id), employees=len(breakdowns), skipped=len(skipped),
        )

        return {
            "payroll_run_id": run.id,
            "period_month": run.period_month,
            "period_year": run.period_year,
            "financial_year": financial_year(period_end),
            "state_code": state_code,
            "employee_count": len(breakdowns),
            "total_gross": money(total_gross),
            "total_deductions": money(total_deductions),
            "total_net": money(total_net),
            "total_employer_cost": money(total_employer),
            "breakdowns": breakdowns,
            "warnings": calculator.warnings + skipped,
        }

    @staticmethod
    def _compute_one(
        profile: EmployeePayrollProfile,
        attendance: PayrollAttendance,
        calculator: StatutoryCalculator,
    ) -> dict[str, Any]:
        working = money(attendance.working_days)
        paid_days = money(attendance.present_days) + money(attendance.paid_leave_days)
        lwp = money(attendance.lwp_days)

        # Loss of pay reduces earnings pro rata against the month's working days.
        basic_earned = prorate(money(profile.base_salary), paid_days, working)
        allowances = prorate(sum_money((profile.monthly_allowances or {}).values()), paid_days, working)
        gross = money(basic_earned + allowances)

        pf_employee, pf_employer, eps_employer = calculator.provident_fund(basic_earned)
        esi_employee, esi_employer = calculator.employee_state_insurance(gross)
        professional_tax = calculator.professional_tax(gross)

        declared = profile.monthly_deductions or {}
        tds = calculator.tax_deducted_at_source(gross, money(declared.get("tds", 0)))
        other = sum_money(v for k, v in declared.items() if k.lower() != "tds")

        total_deductions = money(pf_employee + esi_employee + professional_tax + tds + other)
        net = money(gross - total_deductions)

        notes: list[str] = []
        if net < ZERO:
            # Never emit a negative payslip; cap and flag for a human.
            notes.append("Deductions exceeded gross pay; net was floored at zero for review.")
            net = ZERO

        return {
            "employee_profile_id": profile.id,
            "employee_name": profile.employee_name,
            "working_days": working,
            "paid_days": paid_days,
            "lwp_days": lwp,
            "basic_salary_earned": basic_earned,
            "allowances": allowances,
            "gross_salary": gross,
            "pf_employee": pf_employee,
            "pf_employer": pf_employer,
            "eps_employer": eps_employer,
            "esi_employee": esi_employee,
            "esi_employer": esi_employer,
            "professional_tax": professional_tax,
            "tds": tds,
            "other_deductions": other,
            "total_deductions": total_deductions,
            "net_salary": net,
            "employer_cost": money(gross + pf_employer + eps_employer + esi_employer),
            "notes": notes,
        }


class PayrollProfileService(BaseService[EmployeePayrollProfile, PayrollProfileRepository]):
    module = Module.PAYROLL

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if await ClientRepository(self.repo.session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        if await self.repo.code_taken(data["client_id"], data["employee_code"]):
            raise AlreadyExistsError("That employee code is already in use for this client.")
        return data


class AttendanceService(BaseService[PayrollAttendance, AttendanceRepository]):
    module = Module.PAYROLL

    async def bulk_upsert(self, records: list[dict[str, Any]], auth: AuthContext) -> dict[str, Any]:
        """Import a month of attendance. Re-importing corrects rather than duplicates."""
        self._require(auth, Action.CREATE)

        profile_repo = PayrollProfileRepository(self.repo.session)
        succeeded = 0
        errors: list[dict[str, Any]] = []

        for index, record in enumerate(records):
            profile = await profile_repo.get(record["employee_profile_id"])
            if profile is None:
                errors.append({"index": index, "error": "Unknown payroll profile."})
                continue

            period = date(record["period_year"], record["period_month"], 1)
            if period > date.today().replace(day=1):
                errors.append({"index": index, "error": "Attendance cannot be recorded for a future month."})
                continue

            await self.repo.upsert(record, auth.user_id)
            succeeded += 1

        return {
            "requested": len(records),
            "succeeded": succeeded,
            "failed": len(errors),
            "errors": errors,
        }


class StatutoryConfigService(BaseService[PayrollStatutoryConfig, StatutoryConfigRepository]):
    """Statutory rate administration. Changing a rate is an audited data edit."""

    module = Module.SETTINGS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if not auth.is_admin:
            raise ForbiddenError("Only an administrator may change statutory rates.")
        data["updated_by"] = auth.user_id
        return data

    async def _before_update(
        self, entity: PayrollStatutoryConfig, data: dict[str, Any], auth: AuthContext
    ) -> dict[str, Any]:
        if not auth.is_admin:
            raise ForbiddenError("Only an administrator may change statutory rates.")
        data["updated_by"] = auth.user_id
        return data


def _last_day_of_month(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def payroll_service(s: AsyncSession) -> PayrollService:
    return PayrollService(PayrollRunRepository(s))


def payroll_profile_service(s: AsyncSession) -> PayrollProfileService:
    return PayrollProfileService(PayrollProfileRepository(s))


def attendance_service(s: AsyncSession) -> AttendanceService:
    return AttendanceService(AttendanceRepository(s))


def statutory_config_service(s: AsyncSession) -> StatutoryConfigService:
    return StatutoryConfigService(StatutoryConfigRepository(s))
