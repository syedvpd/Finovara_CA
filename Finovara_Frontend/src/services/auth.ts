/**
 * auth.ts — the Supabase → cookie-session bridge.
 *
 * Supabase verifies credentials and mints a JWT client-side; we immediately
 * exchange it at POST /auth/session for HTTP-only cookies. The raw token never
 * lives in JS storage (supabase persistSession:false).
 */
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { ApiError } from "../lib/api";

export interface SessionInfo {
  user_id: string;
  email: string | null;
  role: string;
  permissions: string[];
  branch_id: string | null;
  client_id: string | null;
  employee_id: string | null;
  is_staff: boolean;
  is_admin: boolean;
  expires_at: string | null;
}

export async function exchangeSession(access_token: string, refresh_token?: string | null): Promise<SessionInfo> {
  return api.post<SessionInfo>("/auth/session", { access_token, refresh_token });
}
const exchange = exchangeSession;

/** Password login → cookie session. */
export async function login(email: string, password: string): Promise<SessionInfo> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new ApiError(401, "invalid_credentials", error?.message ?? "Invalid email or password.");
  }
  return exchange(data.session.access_token, data.session.refresh_token);
}

/** Self-service client signup. Provisions a 'client' account server-side. */
export async function registerClient(payload: {
  full_name: string; email: string; phone: string; password: string;
}): Promise<void> {
  await api.post<unknown>("/onboarding/register", payload);
}

/** Send an email OTP (magic-code) for passwordless sign-in. */
export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new ApiError(400, "otp_send_failed", error.message);
}

/** Verify the 6-digit OTP → cookie session. */
export async function verifyOtp(email: string, token: string): Promise<SessionInfo> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) {
    throw new ApiError(401, "invalid_otp", error?.message ?? "Invalid or expired OTP.");
  }
  return exchange(data.session.access_token, data.session.refresh_token);
}

/** Send a password-reset email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw new ApiError(400, "reset_failed", error.message);
}

/** Read the current cookie session (throws 401 if none). */
export function currentSession(): Promise<SessionInfo> {
  return api.get<SessionInfo>("/auth/session");
}

/** Sign out this device. Best-effort server revocation; never throws, so the
 *  client always ends up logged out and can navigate away even if the backend
 *  call fails (bad CSRF, network, already-expired cookie). */
export async function logout(): Promise<void> {
  try {
    await api.delete<void>("/auth/session");
  } catch {
    /* ignore — local sign-out below is what matters for the UI */
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}
