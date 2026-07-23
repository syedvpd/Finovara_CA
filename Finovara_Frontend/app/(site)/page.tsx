import type { Metadata } from "next";
import { HomePage } from "@/views/Home/Home";
import { PageShell } from "./_shell";

export const metadata: Metadata = {
  title: "Finovara Chartered Accountants LLP — Financial Clarity for Confident Business Decisions",
  description:
    "Tax, audit, accounting, compliance, GST, payroll and Virtual CFO solutions delivered through professional expertise and secure digital workflows.",
};

export default function HomeRoute() { return <PageShell Comp={HomePage} />; }
