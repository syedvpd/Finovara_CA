/**
 * routes/index.ts
 *
 * Centralised route definitions for Finovara.
 * This maps the `Page` type to human-readable route paths.
 * The app currently uses a custom page-state router (no React Router).
 * This file serves as the single source of truth for all route paths,
 * making future migrations to React Router straightforward.
 */

import type { Page } from "../types";

export const ROUTES: Record<Page, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  industries: "/industries",
  insights: "/insights",
  resources: "/resources",
  blogs: "/blogs",
  faqs: "/faqs",
  testimonials: "/testimonials",
  careers: "/careers",
  contact: "/contact",
  book: "/book-consultation",
  login: "/login",
  dashboard: "/dashboard",
  admin: "/admin",
};

/**
 * Convert a URL pathname to a Page key.
 */
export function pathToPage(pathname: string): Page {
  const path = pathname.replace(/^\//, "");
  if (path === "book-consultation") return "book";
  if (!path || path === "home") return "home";
  return (path as Page) || "home";
}
