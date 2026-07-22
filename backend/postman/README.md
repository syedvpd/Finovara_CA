# Postman collection

`Finovara_API.postman_collection.json` — **249 requests across 47 folders**, generated
directly from the FastAPI OpenAPI schema, so it always matches the code.

## Import

1. Postman → **Import** → drop in both files:
   - `Finovara_API.postman_collection.json` (the collection)
   - `Finovara_Local.postman_environment.json` (the environment)
2. Select **Finovara — Local** in the environment picker, top right.
3. Adjust `baseUrl` if the API is not on `http://localhost:8000`.

## Start the API

```bash
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Windows
cp .env.example .env          # then fill in DATABASE_URL and the Supabase keys
.venv/Scripts/uvicorn app.main:app --reload
```

Sanity check before anything else: **Health → Readiness probe**
(`GET /health/ready`). It returns `200` when the database and Redis are both
reachable, `503` when the database is not, and reports `degraded` when only
Redis is missing.

## Authenticating

This API does not issue tokens — Supabase Auth does. There are two ways in.

**Bearer token (simplest for testing).** Sign in via Supabase on the client side,
then paste the `access_token` into the `accessToken` environment variable. The
collection sends `Authorization: Bearer {{accessToken}}` on every request.
Bearer requests are exempt from CSRF.

**Cookie session (mirrors the browser).** Run
**Authentication → Exchange Supabase tokens for a cookie session**
(`POST /api/v1/auth/session`) with your tokens in the body. Its test script
stores the CSRF token plus your `userId`, `clientId`, `branchId` and
`employeeId` into collection variables automatically. A collection-level
pre-request script then attaches `X-CSRF-Token` to every subsequent call —
mutating requests are rejected with `CSRF_FAILED` without it.

Confirm what you are authenticated as with
**Authentication → Current session** (`GET /api/v1/auth/session`), which returns
your role and full effective permission list.

## How the collection is set up

- **Path ids use variables.** `/clients/:client_id` resolves to `{{clientId}}`,
  so ids captured by one request flow into later ones. Every `POST` also stores
  the created id in `{{lastCreatedId}}`.
- **Optional query filters are present but disabled.** Tick the ones you want in
  the Params tab rather than typing them out.
- **Request bodies are schema-derived samples.** Replace the placeholder UUIDs
  (`00000000-…`) with real ids. A handful of bodies — vouchers, invoices,
  payments, bank imports, statutory rates — are hand-written with realistic,
  already-valid values.
- **Public Website** requests are set to `noauth` deliberately; those endpoints
  serve the marketing site and take no credentials.
- Every request asserts the response is not a 5xx and carries the standard
  `success` envelope.

## A sensible first run

1. `POST /api/v1/auth/session` — authenticate.
2. `GET /api/v1/branches` — confirm the seeded branches are present.
3. `POST /api/v1/leads` → `POST /api/v1/clients/convert-lead/{lead_id}` — the
   onboarding path.
4. `POST /api/v1/client-entities` — add a legal entity (PAN and GSTIN are
   cross-validated; the GSTIN must embed the PAN).
5. `POST /api/v1/invoices` — totals are computed from the line items.
6. `POST /api/v1/payments` — the database trigger reconciles the invoice and
   posts a balanced ledger entry.
7. `GET /api/v1/analytics/dashboard/firm` — see it reflected in the KPIs.

## Regenerating

The collection is generated, not maintained by hand. After changing any route
or schema:

```bash
cd backend
PYTHONPATH=. .venv/Scripts/python scripts/generate_postman.py
```

## Known limits

- Report generation and notification dispatch are **queued but have no worker
  yet**, so those rows stay `queued` / `pending`.
- File uploads need a real file selected in the form-data body; Postman cannot
  store one inside an exported collection.
- Signed download URLs require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  to be configured, otherwise they return `DEPENDENCY_UNAVAILABLE`.
