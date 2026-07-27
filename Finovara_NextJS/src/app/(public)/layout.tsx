"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/hero/AnnouncementBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-[#102A43]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="fixed w-full top-0 z-[60] flex flex-col">
        {isHome && <AnnouncementBar />}
        <Navbar />
      </div>
      <div style={{ paddingTop: isHome ? 0 : 72 }}>
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
