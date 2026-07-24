# Finovara Chartered Accountants LLP

Enterprise ERP + client portal + corporate website. Monorepo:
- `backend/` — FastAPI (Python 3.12), SQLAlchemy async, Supabase Postgres.
- `Finovara_Frontend/` — React + Vite + TypeScript + Tailwind/shadcn.
- `supabase/` — Postgres schema: migrations, RLS, triggers, tests.

## Backend layering (thin routers, rules in services)
`api/v1/endpoints/*` → `services/*` → `repositories/*` → `models/*` (SQLAlchemy).
- `services/base.py` `BaseService[Model, Repo]`: holds authz (`_require`), status-machine (`transitions` + `_check_transition`), and hooks `_before/_after_create/update/delete`. Subclass per module; keep routers thin.
- `repositories/base.py` `BaseRepository`: scoping (`client_column`, `get_scoped_or_404`), list/create/update/delete with `actor_id`.
- `core/`: `config.py`, `security.py` (`AuthContext`, `.can()`, `.is_client`, `.client_id`, `.user_id`), `permissions.py` (`Module`, `Action`, `perm()`), `exceptions.py` (`ForbiddenError`, `InvalidStateTransitionError`, …), `redis.py`, `logging.py` (structured `get_logger`), `constants.py`.
- Endpoints registered in `api/v1/router.py`. Health in `api/v1/health.py`.

## Auth / RBAC
- Supabase verifies password + issues JWT → frontend exchanges at `POST /api/v1/auth/session` for **HTTP-only cookie**. Mutations require `X-CSRF-Token` double-submit header.
- Authorization enforced in **service layer**: 12 roles × 33 modules × 6 actions via `auth.can(perm(module, action))`. DB RLS = defence in depth. Frontend guards = UX only.
- Custom Access Token Hook (`public.custom_access_token_hook`) injects role into JWT — without it every request is treated as client.

## Money
`Decimal` end to end. Invoice totals computed from line items server-side (never from client). Paid/outstanding maintained by DB trigger. Payroll rates in `payroll_statutory_config` (effective-dated, state-aware).

## Frontend
`src/`: `services/` (`auth.ts`, `crud.ts` generic client, `public.ts`, `index.ts`), `pages/` (by domain), `components`, `context`, `hooks`, `layouts`, `routes`, `lib`, `types`, `utils`. Deployed on Vercel (`finovara-ca.vercel.app`).

## Run
- Backend: `cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload` — docs `/docs`, health `/health/ready`. Tests: `python -m pytest` (121 tests, `pytest.ini`).
- Frontend: `cd Finovara_Frontend && npm run dev` (port 5173). Backend `CORS_ORIGINS` must include it.
- DB: `supabase db push` (migrations in dependency order — see README).

## Branches
`main` (active), plus `nextjs-migration`, `portal-dynamic`, `portal-light-theme`.
