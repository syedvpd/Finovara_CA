"use client";

import type { ComponentType } from "react";
import { useNav } from "@/lib/nav";

// Renders a legacy page component, injecting the Next-router-backed nav as its
// setPage prop. Components that don't take setPage simply ignore it.
export function PageShell({ Comp }: { Comp: ComponentType<any> }) {
  const nav = useNav();
  return <Comp setPage={nav} />;
}
