"""Decimal money helpers.

Every monetary value in this system is ``Decimal``. Floats are never used for
money — binary floating point cannot represent 0.1 exactly, and the error
compounds across a payroll run or an invoice line set.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0.00")
PAISE = Decimal("0.01")
RUPEE = Decimal("1")
HUNDRED = Decimal("100")


def money(value: Decimal | int | float | str | None) -> Decimal:
    """Coerce to a 2-decimal amount, rounding half up."""
    if value is None:
        return ZERO
    if isinstance(value, float):
        # Route through str so 0.1 becomes Decimal("0.1"), not its binary
        # approximation.
        value = str(value)
    return Decimal(value).quantize(PAISE, rounding=ROUND_HALF_UP)


def whole_rupees(value: Decimal | int | float | str | None) -> Decimal:
    """Round to the nearest rupee.

    Statutory deductions (PF, ESI, Professional Tax) are remitted in whole
    rupees, so they are rounded before they reach a payslip.
    """
    if value is None:
        return ZERO
    if isinstance(value, float):
        value = str(value)
    return Decimal(value).quantize(RUPEE, rounding=ROUND_HALF_UP).quantize(PAISE)


def percent_of(amount: Decimal, rate_percent: Decimal) -> Decimal:
    """``amount`` × ``rate_percent``%, to two decimals."""
    return money(amount * rate_percent / HUNDRED)


def prorate(amount: Decimal, numerator: Decimal, denominator: Decimal) -> Decimal:
    """Scale an amount by a ratio, guarding against a zero denominator."""
    if denominator <= 0:
        return ZERO
    return money(amount * numerator / denominator)


def sum_money(values: object) -> Decimal:
    """Total an iterable of amounts that may contain strings or ``None``."""
    total = ZERO
    for value in values or ():  # type: ignore[union-attr]
        total += money(value)
    return money(total)
