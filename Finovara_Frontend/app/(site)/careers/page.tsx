import type { Metadata } from "next";
import { CareersPage } from "@/views/Careers/Careers";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Careers — Finovara CA LLP", description: "Join Finovara — open roles in audit, tax, GST, payroll and advisory." };

export default function Route() { return <PageShell Comp={CareersPage} />; }
