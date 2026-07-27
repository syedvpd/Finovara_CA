"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Page } from "@/types";

const PAGE_TO_PATH: Record<Page, string> = {
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
  partner: "/partner",
  ca: "/ca",
  audit: "/audit",
  tax: "/tax",
  gst: "/gst",
  accountant: "/accountant",
  payroll: "/payroll",
  rm: "/rm",
  accountsadmin: "/accountsadmin",
  content: "/content",
  privacy: "/privacy",
  terms: "/terms",
};

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (page: Page) => {
      router.push(PAGE_TO_PATH[page] ?? "/");
    },
    [router]
  );
}
