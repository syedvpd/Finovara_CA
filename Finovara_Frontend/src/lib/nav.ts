"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Page } from "../types/index";

// Bridges the legacy setPage(page) API to Next's router so existing page
// components navigate through real routes without being rewritten.
export function pageToPath(p: Page): string {
  if (p === "home") return "/";
  if (p === "book") return "/book-consultation";
  return `/${p}`;
}

export function pathToPage(pathname: string): Page {
  const seg = (pathname || "/").split("?")[0].replace(/^\/+|\/+$/g, "");
  if (!seg) return "home";
  if (seg === "book-consultation") return "book";
  return seg as Page;
}

export function useNav(): (p: Page) => void {
  const router = useRouter();
  return useCallback(
    (p: Page) => {
      router.push(pageToPath(p));
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router],
  );
}
