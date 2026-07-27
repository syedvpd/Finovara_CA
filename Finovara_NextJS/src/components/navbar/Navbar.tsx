"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { NAV_ITEMS } from "@/utils/constants";
import { useNavigate } from "@/hooks/useNavigate";
import type { Page } from "@/types";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const pathname = usePathname();

  const currentPage = pathname === "/" ? "home" : (pathname.replace("/", "") as Page);

  return (
    <nav className="relative w-full z-50 bg-[#102A43] shadow-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18 py-3">
          <button onClick={() => navigate("home")} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <svg width="20" height="20" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M90 15L165 150H15L90 15Z" fill="white" />
              </svg>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg leading-none text-white" style={{ fontFamily: "Manrope" }}>Finovara</span>
              <span className="text-xs leading-none mt-0.5 font-medium tracking-wider uppercase" style={{ color: "#94A3B8" }}>Chartered Accountants LLP</span>
            </div>
          </button>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative"
                onMouseEnter={() => item.children && setDropdown(item.label)}
                onMouseLeave={() => setDropdown(null)}>
                {item.isButton ? (
                  <button onClick={() => navigate(item.page)}
                    className={`ml-6 text-sm font-semibold px-7 py-2.5 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      currentPage === item.page
                        ? "bg-[#C8A45D] text-[#102A43] border-[#C8A45D] shadow-lg"
                        : "border-[#C8A45D] text-[#C8A45D] hover:bg-[#C8A45D] hover:text-[#102A43] hover:shadow-lg"
                    }`} style={{ fontFamily: "Inter" }}>
                    Login
                  </button>
                ) : (
                  <button onClick={() => !item.children && navigate(item.page)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === item.page || item.children?.some(c => c.page === currentPage)
                        ? "text-white bg-[#087F5B]"
                        : "text-white hover:text-[#087F5B] hover:bg-white/5"
                    }`} style={{ fontFamily: "Inter" }}>
                    {item.children?.find(c => c.page === currentPage)?.label || item.label}
                    {item.children && <ChevronDown size={14} className={`transition-transform ${dropdown === item.label ? "rotate-180" : ""}`} />}
                  </button>
                )}
                {item.children && dropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-black/5 py-2 min-w-[180px] z-50">
                    {item.children.map(child => (
                      <button key={child.label} onClick={() => { navigate(child.page); setDropdown(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors font-medium ${
                          currentPage === child.page ? "text-[#087F5B] bg-[#F7F9FC]" : "text-[#102A43] hover:bg-[#F7F9FC] hover:text-[#087F5B]"
                        }`} style={{ fontFamily: "Inter" }}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-white">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-[#102A43] border-t border-white/10 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) =>
              item.isButton ? (
                <div key={item.label} className="pt-2 pb-1 border-t border-white/10 mt-2 mb-2">
                  <button onClick={() => { navigate(item.page); setMenuOpen(false); }}
                    className={`w-full py-3 rounded-xl border font-semibold text-sm transition-colors ${
                      currentPage === item.page ? "bg-[#C8A45D] text-[#102A43] border-transparent" : "border-[#C8A45D] text-[#C8A45D] hover:bg-[#C8A45D] hover:text-[#102A43]"
                    }`} style={{ fontFamily: "Inter" }}>
                    {item.label}
                  </button>
                </div>
              ) : (
                <button key={item.label} onClick={() => { navigate(item.page); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                    currentPage === item.page || item.children?.some(c => c.page === currentPage)
                      ? "text-white bg-[#087F5B]" : "text-white hover:text-[#087F5B] hover:bg-white/5"
                  }`} style={{ fontFamily: "Inter" }}>
                  {item.children?.find(c => c.page === currentPage)?.label || item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
