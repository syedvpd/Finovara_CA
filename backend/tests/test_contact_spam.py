"""The public contact form is the only unauthenticated write path.

It must accept genuine enquiries, quietly bin obvious bots, and never tell
either one which happened. Exercised against a stub repository so the check
runs without a database.
"""

from typing import Any

import pytest

from app.schemas.content import ContactRequestCreate
from app.services.cms import ContactRequestService


class _StubRepo:
    """Captures what the service decided to persist."""

    def __init__(self) -> None:
        self.created: dict[str, Any] | None = None
        self.session = None

    async def create(self, data: dict[str, Any]) -> Any:
        self.created = data
        return type("Row", (), {"id": "00000000-0000-0000-0000-000000000000", **data})()


def _service(duplicate: bool) -> tuple[ContactRequestService, _StubRepo]:
    svc = ContactRequestService.__new__(ContactRequestService)
    repo = _StubRepo()
    svc.repo = repo  # type: ignore[attr-defined]

    async def _is_duplicate(_data, _ip):  # noqa: ANN001
        return duplicate

    svc._is_duplicate = _is_duplicate  # type: ignore[attr-defined]
    return svc, repo


def _payload(**over: Any) -> dict[str, Any]:
    base = {
        "name": "Genuine Enquirer",
        "email": "enquirer@example.com",
        "phone": "9876500011",
        "message": "I would like to discuss GST registration for a new LLP.",
    }
    base.update(over)
    return base


def test_schema_accepts_the_honeypot_field():
    parsed = ContactRequestCreate(**_payload(website="http://spam.example"))
    assert parsed.website == "http://spam.example"


@pytest.mark.anyio
async def test_genuine_enquiry_is_stored_as_new():
    svc, repo = _service(duplicate=False)
    await svc.submit(_payload(), ip_address="203.0.113.4")

    assert repo.created is not None
    assert repo.created["status"] == "new"
    # The trap value must never reach the column-mapped payload.
    assert "website" not in repo.created


@pytest.mark.anyio
async def test_filled_honeypot_is_binned_as_spam():
    svc, repo = _service(duplicate=False)
    await svc.submit(_payload(website="http://spam.example"), ip_address="203.0.113.9")

    assert repo.created is not None
    assert repo.created["status"] == "spam"
    assert "website" not in repo.created


@pytest.mark.anyio
async def test_immediate_duplicate_is_binned_as_spam():
    svc, repo = _service(duplicate=True)
    await svc.submit(_payload(), ip_address="203.0.113.9")

    assert repo.created is not None
    assert repo.created["status"] == "spam"
