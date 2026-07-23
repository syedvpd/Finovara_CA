import type { Metadata } from "next";
import { IndustriesPage } from "@/views/Industries/Industries";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Industries — Finovara CA LLP", description: "Sector-focused financial and compliance services across IT, manufacturing, healthcare, real estate, e-commerce, startups and more." };

export default function Route() { return <PageShell Comp={IndustriesPage} />; }
