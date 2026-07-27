import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout wraps pages that have the Navbar and Footer.
 * The Navbar/Footer positioning is controlled in App.tsx for
 * page-conditional logic, but this layout can wrap inner content.
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">{children}</main>
    </div>
  );
}
