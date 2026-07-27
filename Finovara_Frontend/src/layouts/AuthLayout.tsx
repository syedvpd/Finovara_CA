import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * AuthLayout wraps the Login page and any future auth flows
 * (registration, password reset, etc.)
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#102a43] to-[#1e4d6b]">
      {children}
    </div>
  );
}
