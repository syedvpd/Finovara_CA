# Finovara Chartered Accountants LLP

Enterprise ERP, client portal, and corporate website.

```
FINOVARA_CA_LLP/
├── Finovara/     React + Vite frontend (TypeScript, Tailwind)
├── backend/      FastAPI backend (Python 3.12, SQLAlchemy, Supabase)
└── supabase/     PostgreSQL schema — migrations, RLS, triggers, tests
```

## Prerequisites

- Python 3.12+
- Node 18+
- **A Supabase project** — the schema depends on Supabase's `auth` and `storage`
  schemas, so plain PostgreSQL is not sufficient.

## 1. Database

Create a Supabase project, then apply the migrations in order:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Migrations, in dependency order:

| File | Contents |
|---|---|
| `20260721000000_init.sql` | 51 tables |
| `20260721000001_logic.sql` | Seed data, functions, triggers, storage buckets |
| `20260721000003_auth.sql` | Custom access token hook (JWT claims) |
| `20260721000004_hardening.sql` | Indexes, race-free numbering, financial integrity |
| `20260721000005_rls_policies.sql` | Complete RLS policy set |
| `20260721000006_missing_modules.sql` | Reports, settings, accounting, payroll config |

Then enable the **Custom Access Token Hook** in the Supabase dashboard
(Authentication → Hooks) and point it at `public.custom_access_token_hook`.
Without this, JWTs carry no role and every request is treated as a client.

## 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt    # Linux/macOS: .venv/bin/pip
cp .env.example .env                             # fill in DATABASE_URL + Supabase keys
.venv/Scripts/python -m uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs · health at `/health/ready`.

```bash
.venv/Scripts/python -m pytest        # 121 tests
```

## 3. Frontend

```bash
cd Finovara
npm install
cp .env.example .env.local            # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Runs at http://localhost:5173. `CORS_ORIGINS` in the backend `.env` must include
that origin, or every request is blocked by the browser.

## Architecture

```
Browser ──► React (Vite)
              │  Supabase Auth issues the tokens
              ▼
           FastAPI ──► PostgreSQL (Supabase)
              │           RLS as defence in depth
              └──────► Supabase Storage (private buckets, signed URLs)
```

**Authentication.** Supabase verifies the password and issues the JWT. The
frontend exchanges it at `POST /api/v1/auth/session` for an HTTP-only cookie, so
the token never lives in JavaScript-reachable storage. Cookie-authenticated
mutations additionally require the `X-CSRF-Token` double-submit header.

**Authorization.** Enforced in the backend service layer — 12 roles × 33 modules
× 6 actions. Database RLS is retained as a second line of defence for anything
reaching Postgres directly (Storage, Realtime). Frontend route guards are UX
only; they are not a security boundary.

**Money** is `Decimal` end to end. Invoice totals are computed from line items,
never accepted from the client; paid and outstanding amounts are maintained by a
database trigger. Payroll statutory rates live in `payroll_statutory_config` —
effective-dated and state-aware, so a budget change is a data edit, not a deploy.

## Testing

- `backend/postman/` — 249-request Postman collection, generated from the
  OpenAPI schema. See its README.
- `supabase/tests/` — database and auth SQL tests.

## Known gaps

- **Report generation and notification dispatch are queued but have no worker.**
  `backend/app/workers/` is empty, so those rows stay `queued` / `pending`.
- **Malware scanning is a stub.** `scan_for_malware()` in
  `backend/app/services/storage.py` returns clean; wire a real scanner before
  accepting uploads from untrusted parties.
- The frontend bundle is a single ~600 kB chunk; it needs code splitting before
  production.
