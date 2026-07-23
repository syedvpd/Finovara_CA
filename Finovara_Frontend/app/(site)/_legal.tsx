"use client";
import { LegalPage } from "@/views/Legal/Legal";
import { useNav } from "@/lib/nav";
export function LegalShell({ page }: { page: "privacy" | "terms" }) {
  const nav = useNav();
  return <LegalPage page={page} setPage={nav} />;
}
