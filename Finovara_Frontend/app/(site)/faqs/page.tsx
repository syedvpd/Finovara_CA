import type { Metadata } from "next";
import { FaqsPage } from "@/views/Faqs/Faqs";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "FAQs — Finovara CA LLP", description: "Answers to common questions about our services, the client portal and security." };

export default function Route() { return <PageShell Comp={FaqsPage} />; }
