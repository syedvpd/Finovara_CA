"""Payroll statutory calculation.

Pure computation, so it runs without a database. These figures end up on real
payslips and in statutory filings, so the arithmetic is pinned here.
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.system import PayrollStatutoryConfig
from app.services.payroll import PayrollService, StatutoryCalculator
from app.utils.money import money, percent_of, prorate, whole_rupees


def config(component: str, **kwargs) -> PayrollStatutoryConfig:
    return PayrollStatutoryConfig(
        financial_year="2025-26",
        component=component,
        effective_from=None,
        slabs=kwargs.pop("slabs", []),
        **kwargs,
    )


@pytest.fixture
def calculator() -> StatutoryCalculator:
    return StatutoryCalculator(
        {
            "pf": config("pf", employee_rate=Decimal("12.000"), employer_rate=Decimal("3.670"),
                        wage_ceiling=Decimal("15000.00")),
            "eps": config("eps", employer_rate=Decimal("8.330"), wage_ceiling=Decimal("15000.00")),
            "esi": config("esi", employee_rate=Decimal("0.750"), employer_rate=Decimal("3.250"),
                          wage_ceiling=Decimal("21000.00")),
            "professional_tax": config("professional_tax", slabs=[
                {"from": 0, "to": 15000, "amount": 0},
                {"from": 15001, "to": 20000, "amount": 150},
                {"from": 20001, "to": None, "amount": 200},
            ]),
            "tds": None,
        }
    )


class TestProvidentFund:
    def test_below_ceiling_uses_actual_wage(self, calculator):
        employee, employer_pf, eps = calculator.provident_fund(Decimal("10000.00"))
        assert employee == Decimal("1200.00")   # 12% of 10,000
        assert employer_pf == Decimal("367.00")  # 3.67%
        assert eps == Decimal("833.00")          # 8.33%

    def test_above_ceiling_is_capped(self, calculator):
        """PF is computed on the ceiling, not the full salary."""
        employee, employer_pf, eps = calculator.provident_fund(Decimal("50000.00"))
        assert employee == Decimal("1800.00")   # 12% of 15,000, not of 50,000
        assert eps == Decimal("1250.00")        # 8.33% of the ceiling, rounded
        # PF is the remainder of the 12% employer liability, not an independent
        # 3.67% rounding — otherwise the two shares sum to 1,801.
        assert employer_pf == Decimal("550.00")
        assert employer_pf + eps == Decimal("1800.00")

    def test_split_reconciles_to_total_employer_share(self, calculator):
        _, employer_pf, eps = calculator.provident_fund(Decimal("15000.00"))
        # 3.67 + 8.33 = 12% of the ceiling.
        assert employer_pf + eps == Decimal("1800.00")

    def test_missing_config_is_nil_and_warns(self):
        calc = StatutoryCalculator({})
        assert calc.provident_fund(Decimal("20000.00")) == (
            Decimal("0.00"), Decimal("0.00"), Decimal("0.00")
        )
        assert any("pf" in w for w in calc.warnings)


class TestEmployeeStateInsurance:
    def test_applies_at_or_below_ceiling(self, calculator):
        employee, employer = calculator.employee_state_insurance(Decimal("20000.00"))
        assert employee == Decimal("150.00")   # 0.75%
        assert employer == Decimal("650.00")   # 3.25%

    def test_exactly_at_ceiling_still_applies(self, calculator):
        employee, _ = calculator.employee_state_insurance(Decimal("21000.00"))
        assert employee > 0

    def test_above_ceiling_is_exempt(self, calculator):
        assert calculator.employee_state_insurance(Decimal("21000.01")) == (
            Decimal("0.00"), Decimal("0.00")
        )


class TestProfessionalTax:
    @pytest.mark.parametrize(
        ("gross", "expected"),
        [
            (Decimal("10000.00"), Decimal("0.00")),
            (Decimal("15000.00"), Decimal("0.00")),
            (Decimal("15001.00"), Decimal("150.00")),
            (Decimal("20000.00"), Decimal("150.00")),
            (Decimal("20001.00"), Decimal("200.00")),
            (Decimal("500000.00"), Decimal("200.00")),  # open-ended top slab
        ],
    )
    def test_slab_boundaries(self, calculator, gross, expected):
        assert calculator.professional_tax(gross) == expected

    def test_no_slabs_is_nil(self):
        assert StatutoryCalculator({"professional_tax": None}).professional_tax(Decimal("99999")) == Decimal("0.00")


class TestTds:
    def test_declared_figure_wins(self, calculator):
        """The employee's declaration reflects investments this system doesn't hold."""
        assert calculator.tax_deducted_at_source(Decimal("80000"), Decimal("5000.00")) == Decimal("5000.00")

    def test_falls_back_to_slabs(self):
        calc = StatutoryCalculator({
            "tds": config("tds", slabs=[
                {"from": 0, "to": 700000, "rate": 0},
                {"from": 700001, "to": None, "rate": 12},
            ])
        })
        assert calc.tax_deducted_at_source(Decimal("50000"), Decimal("0")) == Decimal("0.00")
        # 100,000/month -> 1,200,000/yr -> 12% -> 144,000/yr -> 12,000/month
        assert calc.tax_deducted_at_source(Decimal("100000"), Decimal("0")) == Decimal("12000.00")

    def test_no_config_is_nil(self, calculator):
        assert calculator.tax_deducted_at_source(Decimal("100000"), Decimal("0")) == Decimal("0.00")


def profile(base: str, allowances: dict | None = None, deductions: dict | None = None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        employee_name="Test Employee",
        base_salary=Decimal(base),
        monthly_allowances=allowances or {},
        monthly_deductions=deductions or {},
    )


def attendance(working="30.0", present="30.0", paid_leave="0.0", lwp="0.0"):
    return SimpleNamespace(
        working_days=Decimal(working),
        present_days=Decimal(present),
        paid_leave_days=Decimal(paid_leave),
        lwp_days=Decimal(lwp),
    )


class TestFullPayslip:
    def test_full_month_no_lwp(self, calculator):
        result = PayrollService._compute_one(
            profile("30000.00", {"hra": "12000.00", "conveyance": "1600.00"}),
            attendance(),
            calculator,
        )
        assert result["basic_salary_earned"] == Decimal("30000.00")
        assert result["allowances"] == Decimal("13600.00")
        assert result["gross_salary"] == Decimal("43600.00")
        assert result["pf_employee"] == Decimal("1800.00")     # capped at ceiling
        assert result["esi_employee"] == Decimal("0.00")       # gross above ESI ceiling
        assert result["professional_tax"] == Decimal("200.00")
        assert result["total_deductions"] == Decimal("2000.00")
        assert result["net_salary"] == Decimal("41600.00")

    def test_loss_of_pay_prorates_earnings(self, calculator):
        result = PayrollService._compute_one(
            profile("30000.00", {"hra": "12000.00"}), attendance(present="27.0", lwp="3.0"), calculator
        )
        # 27/30 of each component.
        assert result["basic_salary_earned"] == Decimal("27000.00")
        assert result["allowances"] == Decimal("10800.00")
        assert result["gross_salary"] == Decimal("37800.00")
        assert result["lwp_days"] == Decimal("3.0")

    def test_paid_leave_counts_as_worked(self, calculator):
        full = PayrollService._compute_one(profile("30000.00"), attendance(), calculator)
        with_leave = PayrollService._compute_one(
            profile("30000.00"), attendance(present="25.0", paid_leave="5.0"), calculator
        )
        assert with_leave["gross_salary"] == full["gross_salary"]

    def test_low_wage_employee_attracts_esi(self, calculator):
        result = PayrollService._compute_one(profile("18000.00"), attendance(), calculator)
        assert result["esi_employee"] == Decimal("135.00")   # 0.75% of 18,000
        assert result["esi_employer"] == Decimal("585.00")   # 3.25%
        assert result["pf_employee"] == Decimal("1800.00")   # capped

    def test_employer_cost_exceeds_gross(self, calculator):
        result = PayrollService._compute_one(profile("18000.00"), attendance(), calculator)
        assert result["employer_cost"] > result["gross_salary"]
        assert result["employer_cost"] == (
            result["gross_salary"] + result["pf_employer"] + result["eps_employer"] + result["esi_employer"]
        )

    def test_net_never_negative(self, calculator):
        """Deductions exceeding gross must not produce a negative payslip."""
        result = PayrollService._compute_one(
            profile("10000.00", deductions={"loan": "50000.00"}), attendance(), calculator
        )
        assert result["net_salary"] == Decimal("0.00")
        assert result["notes"], "the anomaly should be flagged for review"

    def test_zero_working_days_does_not_divide_by_zero(self, calculator):
        result = PayrollService._compute_one(
            profile("30000.00"), attendance(working="0.0", present="0.0"), calculator
        )
        assert result["gross_salary"] == Decimal("0.00")

    def test_tds_separated_from_other_deductions(self, calculator):
        result = PayrollService._compute_one(
            profile("50000.00", deductions={"tds": "4000.00", "loan": "1000.00"}),
            attendance(),
            calculator,
        )
        assert result["tds"] == Decimal("4000.00")
        assert result["other_deductions"] == Decimal("1000.00")

    def test_deductions_sum_to_total(self, calculator):
        result = PayrollService._compute_one(
            profile("18000.00", {"hra": "2000.00"}, {"tds": "500.00", "loan": "250.00"}),
            attendance(),
            calculator,
        )
        assert result["total_deductions"] == (
            result["pf_employee"] + result["esi_employee"] + result["professional_tax"]
            + result["tds"] + result["other_deductions"]
        )
        assert result["net_salary"] == result["gross_salary"] - result["total_deductions"]


class TestMoneyHelpers:
    def test_float_does_not_leak_binary_error(self):
        assert money(0.1) == Decimal("0.10")
        assert money(2.675) == Decimal("2.68")  # would truncate to 2.67 via binary float

    def test_rounds_half_up_not_bankers(self):
        assert money("2.345") == Decimal("2.35")
        assert money("2.355") == Decimal("2.36")

    def test_whole_rupees(self):
        assert whole_rupees("1234.49") == Decimal("1234.00")
        assert whole_rupees("1234.50") == Decimal("1235.00")

    def test_percent_of(self):
        assert percent_of(Decimal("15000"), Decimal("12")) == Decimal("1800.00")
        assert percent_of(Decimal("21000"), Decimal("0.75")) == Decimal("157.50")

    def test_prorate_guards_zero_denominator(self):
        assert prorate(Decimal("30000"), Decimal("10"), Decimal("0")) == Decimal("0.00")
        assert prorate(Decimal("30000"), Decimal("15"), Decimal("30")) == Decimal("15000.00")

    def test_none_is_zero(self):
        assert money(None) == Decimal("0.00")
