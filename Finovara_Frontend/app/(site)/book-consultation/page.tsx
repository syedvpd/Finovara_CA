import type { Metadata } from "next";
import { BookPage } from "@/views/Book/Book";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Book a Consultation — Finovara", description: "Book a free 30-minute consultation with a senior Finovara advisor." };

export default function Route() { return <PageShell Comp={BookPage} />; }
