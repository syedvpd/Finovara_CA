import type { Metadata } from "next";
import { AuthProvider } from "@/context";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Finovara Chartered Accountants LLP",
  description: "Professional Tax, Audit, GST, Accounting, Payroll, Compliance, and Virtual CFO solutions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
