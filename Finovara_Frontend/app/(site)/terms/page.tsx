import type { Metadata } from "next";
import { LegalShell } from "../_legal";
export const metadata: Metadata = { title: "Terms of Service — Finovara CA LLP", description: "The terms governing use of Finovara's website and client portal." };
export default function Route() { return <LegalShell page="terms" />; }
