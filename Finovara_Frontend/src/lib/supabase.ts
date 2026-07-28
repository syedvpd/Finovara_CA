import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud in dev; the login flow will fail clearly rather than silently.
  console.error(
    "Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local"
  );
}

// Snapshot the recovery/invite marker the instant this module evaluates —
// synchronously, BEFORE createClient's detectSessionInUrl (async) strips the
// tokens from the URL. Without this, the login page misses the set-password
// screen whenever the PASSWORD_RECOVERY event fires before React mounts.
export const arrivedViaRecovery =
  typeof window !== "undefined" &&
  /type=(recovery|invite|signup)/.test(window.location.hash + "&" + window.location.search);

// persistSession:false — the backend holds the tokens in HTTP-only cookies.
// Supabase-js is used only to verify the password and mint the JWT, which we
// immediately hand to POST /auth/session. Keeping the token out of
// localStorage is the whole point of the cookie exchange.
//
// createClient throws on an empty URL, which would blank the whole app before
// the user has filled .env.local. Fall back to a syntactically valid
// placeholder so the module loads; any auth call then fails with a clear
// network error instead of taking the page down at import time.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key", {
  auth: {
    persistSession: false,
    // Keeps the in-memory Supabase session alive past its own JWT expiry.
    // AuthContext separately re-exchanges it into the app's (shorter-lived)
    // cookie session on a timer, since that cookie expires well before the
    // Supabase JWT would naturally trigger this.
    autoRefreshToken: true,
    detectSessionInUrl: true, // password-reset links land back here
    // implicit (hash) flow, not PKCE: PKCE needs a code_verifier persisted in
    // storage, which persistSession:false disables — so recovery/invite links
    // would silently fail (and break entirely if opened on another device).
    // Implicit returns the tokens in the URL hash, firing PASSWORD_RECOVERY.
    flowType: "implicit",
  },
});
