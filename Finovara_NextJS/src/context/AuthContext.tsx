"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Page } from "@/types";
import { SessionInfo, login as doLogin, verifyOtp as doVerifyOtp, logout as doLogout, currentSession, exchangeSession } from "@/services/auth";
import { supabase } from "@/lib/supabase";
import { ApiError } from "@/lib/api";

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
  recoverPassword: (newPassword: string) => Promise<SessionInfo>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    currentSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

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
