-- 20260721000008_auth_hardening.sql
-- Banking-grade authentication policy layer.
--
-- Supabase Auth performs the cryptography (password hashing, OTP, TOTP, reset
-- links, refresh rotation). These tables hold the policy and forensic state it
-- does not: lockout, password history, device registry, session revocation and
-- the security audit trail.

-- ============================================================
-- 1. LOGIN ATTEMPTS  (brute-force detection)
--    Recorded by email rather than user id: a failed attempt against an
--    address that does not exist must still be counted, or the endpoint
--    becomes a user-enumeration oracle.
-- ============================================================
create table if not exists public.login_attempts (
    id           uuid primary key default gen_random_uuid(),
    email        citext not null,
    user_id      uuid references public.users(id) on delete set null,
    ip_address   varchar(45) not null,
    user_agent   text,
    successful   boolean not null default false,
    failure_reason varchar(50),
    attempted_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_email_time
    on public.login_attempts(email, attempted_at desc);
create index if not exists idx_login_attempts_ip_time
    on public.login_attempts(ip_address, attempted_at desc);
create index if not exists idx_login_attempts_failures
    on public.login_attempts(email, attempted_at desc) where successful = false;

-- ============================================================
-- 2. ACCOUNT LOCKOUTS
-- ============================================================
create table if not exists public.account_lockouts (
    id            uuid primary key default gen_random_uuid(),
    email         citext not null unique,
    user_id       uuid references public.users(id) on delete cascade,
    failed_count  integer not null default 0,
    locked_until  timestamptz,
    lock_reason   varchar(100),
    last_failure_at timestamptz,
    unlocked_by   uuid references public.users(id) on delete set null,
    unlocked_at   timestamptz,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_lockouts_active
    on public.account_lockouts(locked_until) where locked_until is not null;

-- ============================================================
-- 3. PASSWORD HISTORY
--    Supabase stores the live credential; we keep only hashes of superseded
--    passwords so a reuse check is possible. Never plaintext, never reversible.
-- ============================================================
create table if not exists public.password_history (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    password_hash text not null,
    changed_at    timestamptz not null default now(),
    changed_by_ip varchar(45)
);
create index if not exists idx_password_history_user
    on public.password_history(user_id, changed_at desc);

-- ============================================================
-- 4. DEVICE REGISTRY
--    A stable fingerprint of the browser/app, so an unfamiliar device can be
--    challenged and the user can see and revoke their own sessions.
-- ============================================================
create table if not exists public.user_devices (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    fingerprint   varchar(64) not null,
    display_name  varchar(150),
    device_type   varchar(30),
    browser       varchar(60),
    operating_system varchar(60),
    ip_address    varchar(45),
    last_seen_at  timestamptz not null default now(),
    first_seen_at timestamptz not null default now(),
    is_trusted    boolean not null default false,
    trusted_at    timestamptz,
    revoked_at    timestamptz,
    unique (user_id, fingerprint)
);
create index if not exists idx_devices_user on public.user_devices(user_id, last_seen_at desc);

-- ============================================================
-- 5. MFA ENROLMENT
--    Mirrors the Supabase factor so policy can be enforced server-side and a
--    role requirement can be applied without calling out to Auth per request.
-- ============================================================
create table if not exists public.user_mfa_factors (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    factor_id     varchar(100) not null,
    factor_type   varchar(20) not null default 'totp' check (factor_type in ('totp', 'phone')),
    friendly_name varchar(100),
    status        varchar(20) not null default 'unverified'
                  check (status in ('unverified', 'verified', 'revoked')),
    verified_at   timestamptz,
    last_used_at  timestamptz,
    created_at    timestamptz not null default now(),
    unique (user_id, factor_id)
);
create index if not exists idx_mfa_user on public.user_mfa_factors(user_id, status);

-- ============================================================
-- 6. SESSION HARDENING
--    Refresh-token rotation needs a family id: if a already-rotated token is
--    replayed, the whole family is revoked because that indicates theft.
-- ============================================================
alter table public.user_sessions add column if not exists family_id uuid default gen_random_uuid();
alter table public.user_sessions add column if not exists device_id uuid references public.user_devices(id) on delete set null;
alter table public.user_sessions add column if not exists ip_address varchar(45);
alter table public.user_sessions add column if not exists user_agent text;
alter table public.user_sessions add column if not exists absolute_expires_at timestamptz;
alter table public.user_sessions add column if not exists revoked_at timestamptz;
alter table public.user_sessions add column if not exists revoked_reason varchar(60);
alter table public.user_sessions add column if not exists rotated_from uuid;

create index if not exists idx_sessions_family on public.user_sessions(family_id);
create index if not exists idx_sessions_active
    on public.user_sessions(user_id, last_active_at desc) where revoked_at is null;

-- ============================================================
-- 7. SECURITY EVENT LOG  (append-only forensic trail)
-- ============================================================
create table if not exists public.security_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references public.users(id) on delete set null,
    email       citext,
    event_type  varchar(50) not null,
    severity    varchar(20) not null default 'info'
                check (severity in ('info', 'warning', 'critical')),
    ip_address  varchar(45),
    user_agent  text,
    metadata    jsonb not null default '{}',
    created_at  timestamptz not null default now()
);
create index if not exists idx_security_events_user on public.security_events(user_id, created_at desc);
create index if not exists idx_security_events_type on public.security_events(event_type, created_at desc);
create index if not exists idx_security_events_critical
    on public.security_events(created_at desc) where severity = 'critical';

-- ============================================================
-- 8. STEP-UP OTP
--    For confirming a high-value action (approving a refund, releasing a
--    payment) where re-authenticating the whole session is disproportionate.
--    Only a hash is stored, so a database leak does not yield usable codes.
-- ============================================================
create table if not exists public.step_up_challenges (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.users(id) on delete cascade,
    code_hash    varchar(64) not null,
    purpose      varchar(50) not null,
    reference_id uuid,
    attempts     integer not null default 0,
    max_attempts integer not null default 3,
    expires_at   timestamptz not null,
    consumed_at  timestamptz,
    created_at   timestamptz not null default now(),
    ip_address   varchar(45)
);
create index if not exists idx_stepup_user on public.step_up_challenges(user_id, created_at desc);
create index if not exists idx_stepup_open
    on public.step_up_challenges(expires_at) where consumed_at is null;

-- ============================================================
-- 9. TRIGGERS
-- ============================================================
create trigger trg_lockouts_updated_at before update on public.account_lockouts
  for each row execute procedure public.update_updated_at_column();

-- ============================================================
-- 10. RLS
--     Every table here is security-sensitive: a user may read their own
--     devices and sessions; everything else is administrator-only. Nothing is
--     client-writable — these rows are written by the backend service role.
-- ============================================================
alter table public.login_attempts      enable row level security;
alter table public.account_lockouts    enable row level security;
alter table public.password_history    enable row level security;
alter table public.user_devices        enable row level security;
alter table public.user_mfa_factors    enable row level security;
alter table public.security_events     enable row level security;
alter table public.step_up_challenges  enable row level security;

create policy "admin_read" on public.login_attempts for select to authenticated
  using (public.is_admin());

create policy "admin_manage" on public.account_lockouts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Password hashes are never readable through the API, by anyone.
create policy "no_read" on public.password_history for select to authenticated using (false);

create policy "own_devices" on public.user_devices for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "own_devices_update" on public.user_devices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_factors" on public.user_mfa_factors for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "own_security_events" on public.security_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Challenge codes are verified server-side only.
create policy "no_read" on public.step_up_challenges for select to authenticated using (false);

-- ============================================================
-- 11. POLICY DEFAULTS
-- ============================================================
insert into public.app_settings (key, value, category, description) values
  ('auth.max_failed_attempts',      '5',     'security', 'Failed sign-ins before an account is locked'),
  ('auth.lockout_minutes',          '15',    'security', 'How long an account stays locked'),
  ('auth.attempt_window_minutes',   '15',    'security', 'Window over which failed attempts are counted'),
  ('auth.password_min_length',      '12',    'security', 'Minimum password length'),
  ('auth.password_history_depth',   '5',     'security', 'Previous passwords that may not be reused'),
  ('auth.password_max_age_days',    '180',   'security', 'Force a password change after this many days'),
  ('auth.mfa_required_roles',
   '["super_admin","managing_partner","accounts_admin"]', 'security',
   'Roles that must enrol in MFA before privileged actions are permitted'),
  ('auth.step_up_ttl_seconds',      '300',   'security', 'Lifetime of a step-up verification code'),
  ('auth.step_up_actions',
   '["refund.approve","invoice.void","payroll.mark_paid","credit_note.issue"]', 'security',
   'Actions that require step-up verification'),
  ('auth.session_idle_minutes',     '30',    'security', 'Idle timeout before a session must be re-established'),
  ('auth.session_absolute_hours',   '12',    'security', 'Maximum session lifetime regardless of activity'),
  ('auth.trusted_device_days',      '30',    'security', 'How long a device stays trusted after verification')
on conflict (key) do nothing;
