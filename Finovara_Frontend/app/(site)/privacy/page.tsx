import type { Metadata } from "next";
import { LegalShell } from "../_legal";
export const metadata: Metadata = { title: "Privacy Policy — Finovara CA LLP", description: "How Finovara collects, uses and protects your data." };
export default function Route() { return <LegalShell page="privacy" />; }
