"""Generate a Postman v2.1 collection from the FastAPI OpenAPI schema."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

os.environ.update(
    APP_ENV="development",
    DATABASE_URL="postgresql+asyncpg://u:p@localhost:5432/postgres",
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_JWT_SECRET="placeholder",
    SUPABASE_JWT_ALGORITHM="HS256",
    CORS_ORIGINS="http://localhost:3000",
    COOKIE_SECURE="false",
)

from app.main import app  # noqa: E402

spec = app.openapi()
components = spec.get("components", {}).get("schemas", {})

# Path params that should map onto shared collection variables rather than a
# per-request literal, so a chained run reuses ids captured earlier.
VAR_HINTS = {
    "item_id": "itemId",
    "client_id": "clientId",
    "employee_id": "employeeId",
    "branch_id": "branchId",
    "document_id": "documentId",
    "task_id": "taskId",
    "audit_id": "auditId",
    "observation_id": "observationId",
    "invoice_id": "invoiceId",
    "payment_id": "paymentId",
    "run_id": "payrollRunId",
    "voucher_id": "voucherId",
    "transaction_id": "bankTxnId",
    "report_id": "reportId",
    "query_id": "queryId",
    "notification_id": "notificationId",
    "kyc_id": "kycId",
    "lead_id": "leadId",
    "gst_return_id": "gstReturnId",
    "slug": "blogSlug",
}

SAMPLE_UUID = "00000000-0000-0000-0000-000000000000"

# Bodies where a purely schema-derived sample would fail validation (a voucher
# whose lines are 0/0 does not balance; a payment of 0 is rejected). These are
# hand-written so the request works the moment real ids are filled in.
BODY_OVERRIDES: dict[tuple[str, str], dict] = {
    ("post", "/api/v1/vouchers"): {
        "client_id": "{{clientId}}",
        "branch_id": "{{branchId}}",
        "voucher_type": "journal",
        "voucher_date": "2026-04-01",
        "narration": "Professional fees billed to client",
        "reference": "REF-001",
        "lines": [
            {"account_id": SAMPLE_UUID, "debit_amount": "10000.00", "credit_amount": "0.00",
             "narration": "Accounts receivable"},
            {"account_id": SAMPLE_UUID, "debit_amount": "0.00", "credit_amount": "10000.00",
             "narration": "Professional fee income"},
        ],
    },
    ("post", "/api/v1/invoices"): {
        "client_id": "{{clientId}}",
        "branch_id": "{{branchId}}",
        "issue_date": "2026-04-01",
        "due_date": "2026-04-30",
        "discount_amount": "0.00",
        "notes": "Statutory audit fees for FY 2025-26",
        "items": [
            {"description": "Statutory audit — FY 2025-26", "quantity": 1,
             "unit_price": "50000.00", "tax_rate_percent": "18.00"},
            {"description": "GST return filing — Q1", "quantity": 3,
             "unit_price": "2500.00", "tax_rate_percent": "18.00"},
        ],
    },
    ("post", "/api/v1/payments"): {
        "invoice_id": "{{invoiceId}}",
        "amount": "59000.00",
        "payment_method": "net_banking",
        "payment_date": "2026-04-05",
        "transaction_id": "NEFT-2026-000123",
    },
    ("post", "/api/v1/bank-transactions/import"): {
        "client_id": "{{clientId}}",
        "account_id": None,
        "rows": [
            {"transaction_date": "2026-04-05", "description": "NEFT CR ACME PVT LTD",
             "debit_amount": "0.00", "credit_amount": "59000.00",
             "reference": "NEFT-2026-000123", "value_date": "2026-04-05"},
            {"transaction_date": "2026-04-07", "description": "BANK CHARGES",
             "debit_amount": "236.00", "credit_amount": "0.00", "reference": "CHG-0407"},
        ],
    },
    ("post", "/api/v1/attendance/bulk"): {
        "records": [
            {"employee_profile_id": SAMPLE_UUID, "period_month": 4, "period_year": 2026,
             "working_days": "30.0", "present_days": "28.0", "paid_leave_days": "2.0",
             "lwp_days": "0.0", "overtime_hours": "0.00"},
        ]
    },
    ("post", "/api/v1/statutory-rates"): {
        "financial_year": "2025-26",
        "component": "professional_tax",
        "state_code": "TS",
        "effective_from": "2025-04-01",
        "slabs": [
            {"from": 0, "to": 15000, "amount": 0},
            {"from": 15001, "to": 20000, "amount": 150},
            {"from": 20001, "to": None, "amount": 200},
        ],
        "notes": "Telangana monthly Professional Tax slabs",
    },
    ("post", "/api/v1/notifications/broadcast"): {
        "template_code": "compliance_reminder",
        "recipient_ids": ["{{userId}}"],
        "context": {"client_name": "Acme Pvt Ltd", "due_date": "2026-04-20"},
        "send_after": None,
    },
    ("post", "/api/v1/auth/session"): {
        "access_token": "<paste the Supabase access_token here>",
        "refresh_token": "<paste the Supabase refresh_token here>",
    },
    ("post", "/api/v1/public/contact"): {
        "name": "Priya Nair",
        "email": "priya@example.com",
        "phone": "+919000000000",
        "subject": "GST registration enquiry",
        "message": "We are a new private limited company and need help with GST registration.",
    },
}


def resolve(schema: dict, depth: int = 0) -> dict:
    """Follow a $ref one level; guards against runaway recursion."""
    if depth > 12:
        return {}
    if "$ref" in schema:
        name = schema["$ref"].rsplit("/", 1)[-1]
        return resolve(components.get(name, {}), depth + 1)
    return schema


def example_for(schema: dict, name: str = "", depth: int = 0) -> object:
    """Build a plausible example value from a JSON-Schema fragment."""
    if depth > 8:
        return None
    schema = resolve(schema, depth)

    if "example" in schema:
        return schema["example"]
    if "default" in schema and schema["default"] is not None:
        return schema["default"]

    # anyOf/allOf: take the first non-null branch.
    for key in ("anyOf", "allOf", "oneOf"):
        if key in schema:
            for option in schema[key]:
                resolved = resolve(option, depth)
                if resolved.get("type") != "null":
                    return example_for(resolved, name, depth + 1)
            return None

    if "enum" in schema and schema["enum"]:
        return schema["enum"][0]

    fmt = schema.get("format", "")
    kind = schema.get("type")

    if kind == "object" or "properties" in schema:
        return {
            prop: example_for(sub, prop, depth + 1)
            for prop, sub in schema.get("properties", {}).items()
            # Read-only server-assigned fields never belong in a request body.
            if prop not in ("id", "created_at", "updated_at", "deleted_at")
        }

    if kind == "array":
        item = example_for(schema.get("items", {}), name, depth + 1)
        return [item] if item is not None else []

    if kind == "boolean":
        return False
    if kind in ("integer", "number"):
        if "minimum" in schema:
            return schema["minimum"]
        return 1 if kind == "integer" else 0

    # Strings: lean on format, then the field name, then the pattern.
    if fmt == "uuid":
        return SAMPLE_UUID
    if fmt == "date":
        return "2026-04-01"
    if fmt == "date-time":
        return "2026-04-01T10:00:00Z"
    if fmt == "email":
        return "person@example.com"

    lowered = name.lower()
    if "email" in lowered:
        return "person@example.com"
    if "phone" in lowered:
        return "+919000000000"
    if lowered == "pan":
        return "ABCDE1234F"
    if "gst" in lowered and "number" in lowered:
        return "36ABCDE1234F1Z5"
    if lowered == "cin":
        return "U72900TS2020PTC123456"
    if "ifsc" in lowered:
        return "HDFC0001234"
    if "financial_year" in lowered or lowered == "tax_year":
        return "2025-26"
    if "slug" in lowered:
        return "example-article"

    if pattern := schema.get("pattern"):
        # Patterns of the form ^(a|b|c)$ enumerate valid values.
        match = re.match(r"^\^\((.+)\)\$$", pattern)
        if match and "|" in match.group(1):
            return match.group(1).split("|")[0]

    return f"sample {name}".strip() or "sample"


def path_to_postman(path: str) -> tuple[str, list[dict]]:
    """Rewrite {param} to :param and collect variables."""
    variables = []

    def sub(match: re.Match[str]) -> str:
        raw = match.group(1)
        var = VAR_HINTS.get(raw)
        value = f"{{{{{var}}}}}" if var else SAMPLE_UUID
        variables.append({"key": raw, "value": value})
        return f":{raw}"

    return re.sub(r"\{([^}]+)\}", sub, path), variables


folders: dict[str, dict] = {}
request_count = 0

for path, methods in sorted(spec["paths"].items()):
    for method, operation in methods.items():
        if method.upper() not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            continue

        tag = (operation.get("tags") or ["General"])[0]
        folder = folders.setdefault(tag, {"name": tag, "item": []})

        postman_path, path_vars = path_to_postman(path)
        segments = [s for s in postman_path.strip("/").split("/") if s]

        query = []
        headers = [{"key": "Accept", "value": "application/json"}]

        for param in operation.get("parameters", []):
            if param.get("in") != "query":
                continue
            value = example_for(param.get("schema", {}), param["name"])
            query.append(
                {
                    "key": param["name"],
                    "value": "" if value is None else str(value),
                    "description": param.get("description", ""),
                    # Optional filters are present but disabled, so the request
                    # works as-is and each filter is one click away.
                    "disabled": not param.get("required", False),
                }
            )

        request: dict = {
            "method": method.upper(),
            "header": headers,
            "url": {
                "raw": "{{baseUrl}}" + postman_path + ("?" + "&".join(
                    f"{q['key']}={q['value']}" for q in query if not q["disabled"]
                ) if any(not q["disabled"] for q in query) else ""),
                "host": ["{{baseUrl}}"],
                "path": segments,
            },
            "description": operation.get("description") or operation.get("summary", ""),
        }
        if query:
            request["url"]["query"] = query
        if path_vars:
            request["url"]["variable"] = path_vars

        body_spec = operation.get("requestBody", {}).get("content", {})
        if "application/json" in body_spec:
            example = BODY_OVERRIDES.get(
                (method, path), example_for(body_spec["application/json"].get("schema", {}))
            )
            headers.append({"key": "Content-Type", "value": "application/json"})
            request["body"] = {
                "mode": "raw",
                "raw": json.dumps(example, indent=2, default=str),
                "options": {"raw": {"language": "json"}},
            }
        elif "multipart/form-data" in body_spec:
            schema = resolve(body_spec["multipart/form-data"].get("schema", {}))
            form = []
            for prop, sub_schema in schema.get("properties", {}).items():
                resolved = resolve(sub_schema)
                if resolved.get("format") == "binary" or prop == "file":
                    form.append({"key": prop, "type": "file", "src": []})
                else:
                    form.append(
                        {"key": prop, "type": "text", "value": str(example_for(sub_schema, prop))}
                    )
            request["body"] = {"mode": "formdata", "formdata": form}

        item: dict = {
            "name": operation.get("summary") or f"{method.upper()} {path}",
            "request": request,
            "response": [],
        }

        # Public endpoints must work without a token.
        if tag == "Public Website":
            item["request"]["auth"] = {"type": "noauth"}

        # Capture the session and ids so a folder can be run end to end.
        if path == "/api/v1/auth/session" and method == "post":
            item["event"] = [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": [
                            "// Stores the session so every later request is authenticated.",
                            "pm.test('session created', () => pm.response.code === 201);",
                            "const body = pm.response.json();",
                            "if (body.data) {",
                            "  pm.collectionVariables.set('userId', body.data.user_id);",
                            "  if (body.data.client_id) pm.collectionVariables.set('clientId', body.data.client_id);",
                            "  if (body.data.branch_id) pm.collectionVariables.set('branchId', body.data.branch_id);",
                            "  if (body.data.employee_id) pm.collectionVariables.set('employeeId', body.data.employee_id);",
                            "}",
                            "const csrf = pm.cookies.get('fv_csrf');",
                            "if (csrf) pm.collectionVariables.set('csrfToken', csrf);",
                        ],
                    },
                }
            ]
        elif method == "post" and not path.endswith(("/read", "/read-all")):
            item["event"] = [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": [
                            "pm.test('2xx', () => pm.response.code < 300);",
                            "const b = pm.response.json();",
                            "if (b && b.data && b.data.id) pm.collectionVariables.set('lastCreatedId', b.data.id);",
                        ],
                    },
                }
            ]
        else:
            item["event"] = [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": [
                            "pm.test('no server error', () => pm.response.code < 500);",
                            "pm.test('envelope present', () => {",
                            "  const b = pm.response.json();",
                            "  pm.expect(b).to.have.property('success');",
                            "});",
                        ],
                    },
                }
            ]

        folder["item"].append(item)
        request_count += 1

collection = {
    "info": {
        "name": "Finovara CA LLP — Backend API (v1)",
        "description": (
            "Auto-generated from the FastAPI OpenAPI schema.\n\n"
            "## Getting started\n"
            "1. Set `baseUrl` (default `http://localhost:8000`).\n"
            "2. Sign in through Supabase Auth on the client side to obtain an access token.\n"
            "3. Either set the `accessToken` collection variable directly, or call "
            "**Authentication → Exchange Supabase tokens for a cookie session**, which "
            "stores the CSRF token and your ids automatically.\n\n"
            "## Authentication\n"
            "Collection-level auth sends `Authorization: Bearer {{accessToken}}`.\n"
            "Bearer requests are exempt from CSRF. If you authenticate by cookie instead, "
            "mutating requests also need the `X-CSRF-Token` header — the collection sends "
            "`{{csrfToken}}` on every request for that case.\n\n"
            "## Notes\n"
            "- Optional query filters are included but disabled; enable the ones you need.\n"
            "- Path ids default to collection variables (`{{clientId}}` etc.) where a sensible "
            "one exists, so ids captured by an earlier request flow into later ones.\n"
            "- Endpoints under **Public Website** are intentionally unauthenticated.\n"
            "- Request bodies are schema-derived samples. Replace placeholder UUIDs with real ids."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}]},
    "event": [
        {
            "listen": "prerequest",
            "script": {
                "type": "text/javascript",
                "exec": [
                    "// Cookie-authenticated mutations require the double-submit CSRF header.",
                    "// Harmless when using a bearer token.",
                    "const csrf = pm.collectionVariables.get('csrfToken');",
                    "if (csrf) pm.request.headers.upsert({ key: 'X-CSRF-Token', value: csrf });",
                ],
            },
        }
    ],
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:8000", "type": "string"},
        {"key": "accessToken", "value": "", "type": "string"},
        {"key": "csrfToken", "value": "", "type": "string"},
        {"key": "userId", "value": "", "type": "string"},
        {"key": "clientId", "value": "", "type": "string"},
        {"key": "branchId", "value": "", "type": "string"},
        {"key": "employeeId", "value": "", "type": "string"},
        {"key": "itemId", "value": "", "type": "string"},
        {"key": "lastCreatedId", "value": "", "type": "string"},
        *[
            {"key": name, "value": "", "type": "string"}
            for name in sorted(set(VAR_HINTS.values()) - {"clientId", "branchId", "employeeId", "itemId"})
        ],
    ],
    "item": [folders[name] for name in sorted(folders)],
}

out = Path(__file__).resolve().parent.parent / "postman"
out.mkdir(parents=True, exist_ok=True)
target = out / "Finovara_API.postman_collection.json"
target.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"folders={len(folders)} requests={request_count}")
print(f"written={target}  size={target.stat().st_size / 1024:.0f} KB")
