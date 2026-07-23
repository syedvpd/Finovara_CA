import type { Metadata } from "next";
import { ServicesPage } from "@/views/Services/Services";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Services — Finovara CA LLP", description: "Income tax, GST, audit, accounting, payroll, company incorporation, Virtual CFO, startup advisory, due diligence and internal controls." };

export default function Route() { return <PageShell Comp={ServicesPage} />; }
