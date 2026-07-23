import type { Metadata } from "next";
import { BlogsPage } from "@/views/Blogs/Blogs";
import { PageShell } from "../_shell";

export const metadata: Metadata = { title: "Blog — Finovara CA LLP", description: "Articles on taxation, GST, audit, compliance and business advisory." };

export default function Route() { return <PageShell Comp={BlogsPage} />; }
