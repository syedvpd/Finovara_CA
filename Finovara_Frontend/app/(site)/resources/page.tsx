import type { Metadata } from "next";
import { ResourcesPage } from "@/views/Resources/Resources";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Resources — Finovara CA LLP", description: "Guides, downloads and tools for tax, GST, audit and compliance." };

export default function Route() { return <PageShell Comp={ResourcesPage} />; }
