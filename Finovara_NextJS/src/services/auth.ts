import { supabase } from "@/lib/supabase";
import { api, ApiError } from "@/lib/api";

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

export async function login(email: string, password: string): Promise<SessionInfo> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new ApiError(401, "invalid_credentials", error?.message ?? "Invalid email or password.");
  return exchangeSession(data.session.access_token, data.session.refresh_token);
}

export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new ApiError(400, "otp_send_failed", error.message);
}

export async function verifyOtp(email: string, token: string): Promise<SessionInfo> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) throw new ApiError(401, "invalid_otp", error?.message ?? "Invalid or expired OTP.");
  return exchangeSession(data.session.access_token, data.session.refresh_token);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/login` });
  if (error) throw new ApiError(400, "reset_failed", error.message);
}

export function currentSession(): Promise<SessionInfo> {
  return api.get<SessionInfo>("/auth/session");
}

export async function logout(): Promise<void> {
  try { await api.delete<void>("/auth/session"); } catch { /* ignore */ }
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}
