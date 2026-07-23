import type { Metadata } from "next";
import { InsightsPage } from "@/views/Insights/Insights";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Insights — Finovara CA LLP", description: "Tax, GST and financial-planning insights and analysis from Finovara's chartered accountants." };

export default function Route() { return <PageShell Comp={InsightsPage} />; }
