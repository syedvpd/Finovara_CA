import type { Metadata } from "next";
import { AboutPage } from "@/views/About/About";
import { PageShell } from "../_shell";

export const metadata: Metadata = {
  title: "About — Finovara Chartered Accountants LLP",
  description:
    "Finovara is a technology-enabled chartered accountancy firm delivering tax, audit, GST, accounting, payroll, compliance, and Virtual CFO services across India.",
};

export default function AboutRoute() {
  return <PageShell Comp={AboutPage} />;
}
