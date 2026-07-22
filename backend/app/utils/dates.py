"""Date helpers for Indian financial years and billing cycles."""

from __future__ import annotations

from datetime import date

from dateutil.relativedelta import relativedelta

#: The Indian financial year starts in April.
FY_START_MONTH = 4

CYCLE_MONTHS = {"monthly": 1, "quarterly": 3, "annually": 12}


def financial_year(on: date | None = None) -> str:
    """'2025-26' for any date inside FY 2025-26."""
    on = on or date.today()
    start = on.year if on.month >= FY_START_MONTH else on.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def assessment_year(fy: str) -> str:
    """The assessment year following a financial year: '2025-26' -> '2026-27'."""
    start = int(fy.split("-")[0]) + 1
    return f"{start}-{str(start + 1)[-2:]}"


def financial_year_bounds(fy: str) -> tuple[date, date]:
    start_year = int(fy.split("-")[0])
    return date(start_year, FY_START_MONTH, 1), date(start_year + 1, FY_START_MONTH - 1, 31)


def next_billing_date(current: date, cycle: str) -> date | None:
    """Advance a billing anchor by one cycle. ``one_time`` has no successor."""
    months = CYCLE_MONTHS.get(cycle)
    if months is None:
        return None
    return current + relativedelta(months=months)


def quarter_of(on: date) -> int:
    """Financial-year quarter (1-4), where Q1 is Apr-Jun."""
    return ((on.month - FY_START_MONTH) % 12) // 3 + 1
