"""Schemas for CRM, client master data, and the service catalogue."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import APIModel

# Indian statutory identifier formats.
PAN_PATTERN = r"^[A-Z]{5}[0-9]{4}[A-Z]$"
GST_PATTERN = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$"
CIN_PATTERN = r"^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$"
PHONE_PATTERN = r"^\+?[0-9]{7,15}$"

Phone = Annotated[str, Field(pattern=PHONE_PATTERN)]
Money = Annotated[Decimal, Field(ge=0, max_digits=15, decimal_places=2)]

LEAD_STATUSES = ("new", "contacted", "consultation_scheduled", "proposal_sent", "onboarding", "won", "lost")
CLIENT_TYPES = ("individual", "partnership", "llp", "private_limited", "startup", "other")
ENTITY_TYPES = ("sole_proprietorship", "partnership", "llp", "pvt_ltd", "public_ltd", "trust", "other")
BILLING_CYCLES = ("one_time", "monthly", "quarterly", "annually")


def _upper(v: str | None) -> str | None:
    return v.upper() if v else v


# --- Leads -------------------------------------------------------------------


class LeadRead(APIModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    company_name: str | None = None
    source: str
    status: str
    assigned_rm_id: uuid.UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class LeadCreate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=150)]
    email: EmailStr
    phone: Phone
    company_name: Annotated[str, Field(max_length=150)] | None = None
    source: Annotated[str, Field(max_length=50)] = "website"
    notes: str | None = None
    assigned_rm_id: uuid.UUID | None = None


class LeadUpdate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    phone: Phone | None = None
    company_name: Annotated[str, Field(max_length=150)] | None = None
    status: Annotated[str, Field(pattern="^(" + "|".join(LEAD_STATUSES) + ")$")] | None = None
    assigned_rm_id: uuid.UUID | None = None
    notes: str | None = None


# --- Consultations -----------------------------------------------------------


class ConsultationRead(APIModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    scheduled_at: datetime
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class ConsultationCreate(APIModel):
    lead_id: uuid.UUID
    scheduled_at: datetime
    notes: str | None = None


class ConsultationUpdate(APIModel):
    scheduled_at: datetime | None = None
    status: Annotated[str, Field(pattern="^(scheduled|completed|cancelled|no_show)$")] | None = None
    notes: str | None = None


# --- Proposals ---------------------------------------------------------------


class ProposalRead(APIModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    title: str
    status: str
    total_value: Decimal
    content: dict[str, Any]
    sent_at: datetime | None = None
    accepted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProposalCreate(APIModel):
    lead_id: uuid.UUID
    title: Annotated[str, Field(min_length=2, max_length=150)]
    total_value: Money = Decimal("0.00")
    content: dict[str, Any] = Field(default_factory=dict)


class ProposalUpdate(APIModel):
    title: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    status: Annotated[str, Field(pattern="^(draft|sent|accepted|rejected|expired)$")] | None = None
    total_value: Money | None = None
    content: dict[str, Any] | None = None


# --- Clients -----------------------------------------------------------------


class ClientEntityRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    legal_name: str
    trade_name: str | None = None
    entity_type: str
    pan: str | None = None
    gst_number: str | None = None
    cin: str | None = None
    registered_address: str
    billing_address: str | None = None
    date_of_incorporation: date | None = None
    created_at: datetime
    updated_at: datetime


class ClientEntityCreate(APIModel):
    client_id: uuid.UUID
    legal_name: Annotated[str, Field(min_length=2, max_length=150)]
    trade_name: Annotated[str, Field(max_length=150)] | None = None
    entity_type: Annotated[str, Field(pattern="^(" + "|".join(ENTITY_TYPES) + ")$")]
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None
    gst_number: Annotated[str, Field(pattern=GST_PATTERN)] | None = None
    cin: Annotated[str, Field(pattern=CIN_PATTERN)] | None = None
    registered_address: Annotated[str, Field(min_length=5)]
    billing_address: str | None = None
    date_of_incorporation: date | None = None

    _up = field_validator("pan", "gst_number", "cin", mode="before")(lambda cls, v: _upper(v))

    @model_validator(mode="after")
    def _gst_matches_pan(self) -> ClientEntityCreate:
        # Characters 3-12 of a GSTIN are the entity's PAN; a mismatch means one
        # of the two was mistyped and would break every downstream filing.
        if self.gst_number and self.pan and self.gst_number[2:12] != self.pan:
            raise ValueError("GST number does not embed the supplied PAN.")
        return self

    @field_validator("date_of_incorporation")
    @classmethod
    def _not_future(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Date of incorporation cannot be in the future.")
        return v


class ClientEntityUpdate(APIModel):
    legal_name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    trade_name: Annotated[str, Field(max_length=150)] | None = None
    pan: Annotated[str, Field(pattern=PAN_PATTERN)] | None = None
    gst_number: Annotated[str, Field(pattern=GST_PATTERN)] | None = None
    cin: Annotated[str, Field(pattern=CIN_PATTERN)] | None = None
    registered_address: str | None = None
    billing_address: str | None = None

    _up = field_validator("pan", "gst_number", "cin", mode="before")(lambda cls, v: _upper(v))


class ClientRead(APIModel):
    id: uuid.UUID
    user_id: uuid.UUID
    client_code: str
    branch_id: uuid.UUID
    relationship_manager_id: uuid.UUID | None = None
    client_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    entities: list[ClientEntityRead] = Field(default_factory=list)


class ClientCreate(APIModel):
    user_id: uuid.UUID
    branch_id: uuid.UUID
    client_type: Annotated[str, Field(pattern="^(" + "|".join(CLIENT_TYPES) + ")$")]
    relationship_manager_id: uuid.UUID | None = None


class ClientUpdate(APIModel):
    branch_id: uuid.UUID | None = None
    relationship_manager_id: uuid.UUID | None = None
    client_type: Annotated[str, Field(pattern="^(" + "|".join(CLIENT_TYPES) + ")$")] | None = None
    status: Annotated[str, Field(pattern="^(active|inactive|suspended)$")] | None = None


class ClientKycRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    document_type: str
    document_url: str
    status: str
    verified_by: uuid.UUID | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime


class ClientKycCreate(APIModel):
    client_id: uuid.UUID
    document_type: Annotated[str, Field(max_length=50)]
    document_url: str


class ClientKycVerify(APIModel):
    status: Annotated[str, Field(pattern="^(verified|rejected)$")]
    rejection_reason: str | None = None

    @model_validator(mode="after")
    def _reason_required_on_reject(self) -> ClientKycVerify:
        if self.status == "rejected" and not (self.rejection_reason or "").strip():
            raise ValueError("A rejection reason is required when rejecting a document.")
        return self


# --- Services ----------------------------------------------------------------


class ServiceRead(APIModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None = None
    department: str
    base_price: Decimal
    billing_cycle: str
    created_at: datetime
    updated_at: datetime


class ServiceCreate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=150)]
    code: Annotated[str, Field(min_length=2, max_length=50)]
    description: str | None = None
    department: Annotated[str, Field(max_length=50)]
    base_price: Money = Decimal("0.00")
    billing_cycle: Annotated[str, Field(pattern="^(" + "|".join(BILLING_CYCLES) + ")$")]

    @field_validator("code")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().upper().replace(" ", "_")


class ServiceUpdate(APIModel):
    name: Annotated[str, Field(min_length=2, max_length=150)] | None = None
    description: str | None = None
    department: Annotated[str, Field(max_length=50)] | None = None
    base_price: Money | None = None
    billing_cycle: Annotated[str, Field(pattern="^(" + "|".join(BILLING_CYCLES) + ")$")] | None = None


class ClientServiceRead(APIModel):
    id: uuid.UUID
    client_id: uuid.UUID
    service_id: uuid.UUID
    status: str
    start_date: date
    end_date: date | None = None
    price_agreed: Decimal
    billing_cycle: str
    next_billing_date: date | None = None
    created_at: datetime
    updated_at: datetime
    service: ServiceRead | None = None


class ClientServiceCreate(APIModel):
    client_id: uuid.UUID
    service_id: uuid.UUID
    start_date: date
    end_date: date | None = None
    price_agreed: Money
    billing_cycle: Annotated[str, Field(pattern="^(" + "|".join(BILLING_CYCLES) + ")$")]

    @model_validator(mode="after")
    def _dates_ordered(self) -> ClientServiceCreate:
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot precede the start date.")
        return self


class ClientServiceUpdate(APIModel):
    status: Annotated[str, Field(pattern="^(active|suspended|completed|cancelled)$")] | None = None
    end_date: date | None = None
    price_agreed: Money | None = None
    billing_cycle: Annotated[str, Field(pattern="^(" + "|".join(BILLING_CYCLES) + ")$")] | None = None
    next_billing_date: date | None = None
