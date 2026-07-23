/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy app has no strict typing; don't block the build on it during the
  // migration. Re-enable once pages are converted and typed.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Same-origin API proxy — the browser only ever talks to this app's origin,
  // so the session cookies (incl. the readable CSRF token) stay first-party.
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_BACKEND || "https://finovara-ca.onrender.com";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
