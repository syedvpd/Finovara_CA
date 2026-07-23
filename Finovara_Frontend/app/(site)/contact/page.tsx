import type { Metadata } from "next";
import { ContactPage } from "@/views/Contact/Contact";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Contact — Finovara CA LLP", description: "Get in touch with Finovara Chartered Accountants LLP. Book a consultation or request portal access." };

export default function Route() { return <PageShell Comp={ContactPage} />; }
