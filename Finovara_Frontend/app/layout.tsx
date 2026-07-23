import type { Metadata } from "next";
import "../src/styles/index.css";

export const metadata: Metadata = {
  title: "Finovara Chartered Accountants LLP",
  description:
    "Taxation, audit, GST, accounting, payroll, compliance, and Virtual CFO services — delivered through professional expertise and a secure digital platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
