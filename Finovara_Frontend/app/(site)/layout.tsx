"use client";

import { usePathname } from "next/navigation";
import { Providers } from "../providers";
import { Navbar } from "@/components/navbar/Navbar";
import { AnnouncementBar } from "@/components/hero/AnnouncementBar";
import { Footer } from "@/components/footer/Footer";
import { useNav, pathToPage } from "@/lib/nav";

// Marketing chrome shared by every SSR page route: fixed navbar (+ announcement
// bar on home) and footer, mirroring the old App.tsx layout.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const page = pathToPage(usePathname());
  const isHome = page === "home";
  return (
    <Providers>
      <div className="min-h-screen bg-[#102A43]" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="fixed w-full top-0 z-[60] flex flex-col">
          {isHome && <AnnouncementBar setPage={nav} />}
          <Navbar currentPage={page} setPage={nav} />
        </div>
        <div style={{ paddingTop: isHome ? 0 : 72 }}>
          <main>{children}</main>
          <Footer setPage={nav} />
        </div>
      </div>
    </Providers>
  );
}
