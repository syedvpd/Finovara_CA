import type { Metadata } from "next";
import { TestimonialsPage } from "@/views/Testimonials/Testimonials";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Testimonials — Finovara CA LLP", description: "What clients say about working with Finovara Chartered Accountants LLP." };

export default function Route() { return <PageShell Comp={TestimonialsPage} />; }
