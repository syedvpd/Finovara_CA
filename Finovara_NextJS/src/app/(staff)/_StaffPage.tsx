"use client";
import { useAuth, roleDisplayName } from "@/context";
import { AdminDashboardPage } from "@/pages/Admin/AdminDashboard";

export default function StaffPage() {
  const { session } = useAuth();
  const userRole = roleDisplayName(session);
  return <AdminDashboardPage userRole={userRole} />;
}
