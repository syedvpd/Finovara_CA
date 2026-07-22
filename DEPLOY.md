# Deploying Finovara

Frontend → **Vercel** · Backend → **Render** · Database → **Supabase** (already hosted).

Config lives in [`render.yaml`](render.yaml) and [`Finovara_Frontend/vercel.json`](Finovara_Frontend/vercel.json).
Real secret **values** are in `backend/.env` (gitignored) — copy them into the host
dashboards; never commit them.

Deploy order matters because each side needs the other's URL:

```
1. Supabase: apply migrations + enable the JWT hook   (prerequisite)
2. Render:   deploy backend            → get  https://finovara-api.onrender.com
3. Vercel:   deploy frontend (uses #2) → get  https://finovara.vercel.app
4. Render:   set CORS_ORIGINS to #3, redeploy
5. Supabase: add #3 to Auth redirect URLs
```

---

## 0. Push the repo to GitHub

Both hosts deploy from a Git repo.

```bash
git add -A && git commit -m "Add deploy config"
git push
```

---

## 1. Supabase — database (do this first, one time)

The backend queries tables that must exist, and **auth breaks without the JWT hook.**

1. Install the Supabase CLI, then from the repo root:
   ```bash
   supabase link --project-ref cubxtfibddiltznvmzde
   supabase db push        # applies supabase/migrations/*.sql in order
   ```
2. Dashboard → **Authentication → Hooks** → enable **Custom Access Token Hook**,
   point it at `public.custom_access_token_hook`.
   *Without this, every JWT carries no role and every user is treated as a client.*
3. Keep note for step 5 (redirect URLs).

> If migrations are already applied, `supabase db push` is a no-op — safe to run.

---

## 2. Render — backend

1. [render.com](https://render.com) → **New → Blueprint** → select this repo.
   Render reads [`render.yaml`](render.yaml) and creates the `finovara-api` service.
2. It will prompt for every `sync: false` var. Paste the values from `backend/.env`:

   | Render env var | Value (from `backend/.env`) |
   |---|---|
   | `DATABASE_URL` | the `postgresql+asyncpg://…pooler…:6543/postgres` string |
   | `SUPABASE_URL` | `https://cubxtfibddiltznvmzde.supabase.co` |
   | `SUPABASE_ANON_KEY` | `sb_publishable_…` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` |
   | `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | from `.env` |
   | `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` | from `.env` |
   | `CORS_ORIGINS` | leave `http://localhost:5173` for now; fix in step 4 |
   | `REDIS_URL` | leave **blank** (optional; app runs without it) |

   `APP_ENV`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `PYTHON_VERSION`, etc.
   are already set in the blueprint — don't override them.
3. Deploy. When live, note the URL, e.g. `https://finovara-api.onrender.com`.
   Check `https://finovara-api.onrender.com/health/ready` → should be `ok`.

> **Free plan cold start:** the service sleeps after inactivity; the first request
> after idle takes ~30–50 s. Upgrade to paid to avoid, or just wait it out.

---

## 3. Vercel — frontend

1. [vercel.com](https://vercel.com) → **Add New → Project** → import this repo.
2. **Set Root Directory = `Finovara_Frontend`** (critical — the repo has other folders).
   Framework auto-detects as Vite; [`vercel.json`](Finovara_Frontend/vercel.json) handles the rest.
3. Add environment variables:

   | Vercel env var | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://finovara-api.onrender.com/api/v1`  ← your Render URL + `/api/v1` |
   | `VITE_SUPABASE_URL` | `https://cubxtfibddiltznvmzde.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_2vVrdwneFDqSdDbu9Aw6Xw_YbCJrckM` |

4. Deploy. Note the URL, e.g. `https://finovara.vercel.app`. **This is your deploy link.**

---

## 4. Render — open CORS to the frontend

Cross-origin cookie auth only works if the backend explicitly allows the frontend origin.

1. Render → `finovara-api` → **Environment** → set:
   ```
   CORS_ORIGINS = https://finovara.vercel.app
   ```
   (comma-separate if you keep localhost too).
2. Save → triggers a redeploy.

---

## 5. Supabase — allow the frontend for auth emails

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://finovara.vercel.app`
- **Redirect URLs:** add `https://finovara.vercel.app/login`
  (password-reset and OTP links redirect here).

---

## Verify

1. Open the Vercel URL → marketing site loads.
2. **Contact form** → submit → success toast (writes to `contact_requests`).
3. **Login** with a real Supabase user → lands on the role's portal.
4. Browser DevTools → Application → Cookies on the API domain: `fv_access`,
   `fv_csrf` present with `Secure` + `SameSite=None`.

## If login fails
- Cookie not set / dropped → `COOKIE_SAMESITE` must be `none` and `COOKIE_SECURE` `true` (both on HTTPS). Already in the blueprint.
- Everyone lands on the client dashboard → the **JWT hook (step 1.2) isn't enabled**.
- CORS error in console → `CORS_ORIGINS` (step 4) doesn't exactly match the Vercel origin.
- 500 on API calls → migrations (step 1.1) not applied.

## Security follow-ups (you chose to skip rotation)
The `service_role` key, DB password, SMTP/Brevo keys were exposed in chat. When
convenient: rotate them in Supabase + Brevo, then update Render env + `backend/.env`.
Also tighten `TRUSTED_HOSTS` from `*` to your Render host.
