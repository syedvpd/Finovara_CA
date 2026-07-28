/**
 * AuthContext — real session state, replacing the mocked role logic.
 *
 * On mount it asks the backend who the current cookie session belongs to
 * (GET /auth/session). Login/OTP go through services/auth, which do the
 * Supabase → cookie exchange. `landingPage` maps the backend role to the
 * frontend Page the mock used, so routing after login is unchanged.
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Page } from "../types/index";
import { SessionInfo, login as doLogin, verifyOtp as doVerifyOtp, logout as doLogout, currentSession, exchangeSession } from "../services/auth";
import { supabase } from "../lib/supabase";
import { ApiError } from "../lib/api";

// Backend Role enum value → frontend Page (matches the old email-prefix routing).
const ROLE_TO_PAGE: Record<string, Page> = {
  super_admin: "admin",
  managing_partner: "partner",
  chartered_accountant: "ca",
  audit_manager: "audit",
  tax_manager: "tax",
  gst_consultant: "gst",
  accountant: "accountant",
  payroll_executive: "payroll",
  relationship_manager: "rm",
  accounts_admin: "accountsadmin",
  content_manager: "content",
  client: "dashboard",
};

export function landingPage(session: SessionInfo): Page {
  return ROLE_TO_PAGE[session.role] ?? "dashboard";
}

// Backend Role enum value → display name used by the admin portal's roleTabMap.
const ROLE_DISPLAY: Record<string, string> = {
  super_admin: "Super Admin",
  managing_partner: "Managing Partner",
  chartered_accountant: "Chartered Accountant",
  audit_manager: "Audit Manager",
  tax_manager: "Tax Manager",
  gst_consultant: "GST Consultant",
  accountant: "Partner Accountant",
  payroll_executive: "Payroll Executive",
  relationship_manager: "Relationship Manager",
  accounts_admin: "Accounts Admin",
  content_manager: "Content Manager",
  client: "Client",
};

export function roleDisplayName(session: SessionInfo | null): string {
  return session ? (ROLE_DISPLAY[session.role] ?? "Client") : "Client";
}

interface AuthState {
  session: SessionInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionInfo>;
  verifyOtp: (email: string, token: string) => Promise<SessionInfo>;
  logout: () => Promise<void>;
  /** Set a new password during a Supabase recovery session, then sign in. */
  recoverPassword: (newPassword: string) => Promise<SessionInfo>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore an existing cookie session on load; 401 just means logged out.
    currentSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // The app's own session cookie expires in 15 minutes (access_token_ttl_seconds),
    // far sooner than the Supabase JWT does — without this, any save made after
    // ~15 minutes of activity fails with "Authentication is required" until the
    // page is reloaded. Re-exchange on a shorter cycle to rotate the cookie first.
    if (!session) return;
    const id = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        try { await exchangeSession(data.session.access_token, data.session.refresh_token); }
        catch { /* next tick retries; a real sign-out will surface on the next request */ }
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    const s = await doLogin(email, password);
    setSession(s);
    return s;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const s = await doVerifyOtp(email, token);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
    setSession(null);
  }, []);

  const recoverPassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new ApiError(400, "recover_failed", error.message);
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError(401, "no_recovery_session", "Recovery link expired. Request a new one.");
    const s = await exchangeSession(data.session.access_token, data.session.refresh_token);
    setSession(s);
    return s;
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, verifyOtp, logout, recoverPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
