import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout wraps the authenticated dashboard and admin pages.
 * Sidebar and top navigation for dashboard views are handled within
 * DashboardPage and AdminDashboardPage components.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1">{children}</div>
    </div>
  );
}
