"use client";

import { AuthProvider } from "../src/context";

// Mirrors the old main.tsx tree (AuthProvider around the app). Client-side
// because auth state and the session fetch run in the browser.
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
