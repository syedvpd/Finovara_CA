import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud in dev; the login flow will fail clearly rather than silently.
  console.error(
    "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

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
    autoRefreshToken: false,
    detectSessionInUrl: true, // password-reset links land back here
  },
});
