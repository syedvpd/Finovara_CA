"use client";

import dynamic from "next/dynamic";
import { Providers } from "../providers";

// Phase 1 of the migration: the existing SPA runs under Next.js at every route
// (optional catch-all), so the app builds and serves on Next.js immediately.
// ssr:false because the legacy App reads window/history during render; later
// phases extract individual pages into server components for true SSR/SEO.
const App = dynamic(() => import("../../src/app/App"), { ssr: false });

export default function CatchAll() {
  return (
    <Providers>
      <App />
    </Providers>
  );
}
