import { useState, useEffect, useRef, useCallback } from "react";
import logo from "../../assets/images/logo1.png";
import {
  Menu, X, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Mail,
  MapPin, Shield, Clock, FileText, BarChart2, Users, Briefcase, CheckCircle,
  Building2, Globe, Star, Quote, Download, Send, Lock, Bell, Folder,
  TrendingUp, Award, Zap, Calendar, MessageCircle, ExternalLink, Play,
  BookOpen, Search, Filter, Heart, Linkedin, Twitter, Instagram, Youtube,
  Facebook, ChevronLeft, PieChart, DollarSign, FileCheck, UserCheck,
  AlertCircle, Info, ArrowUpRight, Target, Layers, Cpu, Lightbulb, Flag,
  CreditCard, ClipboardList, UploadCloud, AlertTriangle, HelpCircle,
  ReceiptText, User2, LogOut
} from "lucide-react";
import { Page } from "../../types/index";
import { NAV_ITEMS } from "../../utils/constants";

export function Navbar({ currentPage, setPage }: { currentPage: Page; setPage: (p: Page) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBase = "bg-[#102A43] shadow-sm border-b border-white/10";
  const textColor = "text-white";
  const logoColor = "white";

  return (
    <nav className={`relative w-full z-50 transition-all duration-300 ${navBase}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo — fixed left */}
          <button onClick={() => setPage("home")} className="flex items-center gap-2 shrink-0" style={{ minWidth: "200px" }}>
            <img src={logo} alt="Finovara Logo" className="h-12 w-auto object-contain" style={{ mixBlendMode: "screen" }} />
            <div className="flex flex-col items-start">
              <span className="font-bold text-base leading-none" style={{ fontFamily: "Manrope", color: "white" }}>Finovara</span>
              <span className="text-[10px] leading-none mt-0.5 font-medium tracking-wider uppercase" style={{ color: "#94A3B8" }}>Chartered Accountants LLP</span>
            </div>
          </button>

          {/* Nav links — centered */}
          <div className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {NAV_ITEMS.filter(i => !i.isButton).map((item) => (
              <div key={item.label} className="relative"
                onMouseEnter={() => item.children && setDropdown(item.label)}
                onMouseLeave={() => setDropdown(null)}>
                <button
                  onClick={() => !item.children && setPage(item.page)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    currentPage === item.page || item.children?.some(c => c.page === currentPage)
                      ? "text-white bg-[#087F5B]"
                      : `${textColor} hover:text-[#087F5B] hover:bg-white/5`
                  }`}
                  style={{ fontFamily: "Inter" }}>
                  {item.children?.find(c => c.page === currentPage)?.label || item.label}
                  {item.children && <ChevronDown size={14} className={`transition-transform ${dropdown === item.label ? "rotate-180" : ""}`} />}
                </button>
                {item.children && dropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-black/5 py-2 min-w-[180px] z-50">
                    {item.children.map(child => (
                      <button key={child.label} onClick={() => { setPage(child.page); setDropdown(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors font-medium ${
                          currentPage === child.page
                            ? "text-[#087F5B] bg-[#F7F9FC]"
                            : "text-[#102A43] hover:bg-[#F7F9FC] hover:text-[#087F5B]"
                        }`}
                        style={{ fontFamily: "Inter" }}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Login button — fixed right */}
          <div className="hidden lg:flex items-center shrink-0" style={{ minWidth: "140px", justifyContent: "flex-end" }}>
            {NAV_ITEMS.filter(i => i.isButton).map(item => (
              <button key={item.label} onClick={() => setPage(item.page)}
                className={`text-sm font-semibold px-6 py-2.5 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  currentPage === item.page
                    ? "bg-[#C8A45D] text-[#102A43] border-[#C8A45D] shadow-lg"
                    : "border-[#C8A45D] text-[#C8A45D] hover:bg-[#C8A45D] hover:text-[#102A43] hover:shadow-lg"
                }`}
                style={{ fontFamily: "Inter", letterSpacing: "0.03em" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M17 11l2 2 4-4"/></svg>
                Login
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className={`lg:hidden p-2 rounded-lg ${textColor}`}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-[#102A43] border-t border-white/10 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              item.isButton ? (
                <div key={item.label} className="pt-2 pb-1 border-t border-white/10 mt-2 mb-2">
                  <button onClick={() => { setPage(item.page); setMenuOpen(false); }}
                    className={`w-full py-3 rounded-xl border font-semibold text-sm transition-colors ${
                      currentPage === item.page
                        ? "bg-[#C8A45D] text-[#102A43] border-transparent"
                        : "border-[#C8A45D] text-[#C8A45D] hover:bg-[#C8A45D] hover:text-[#102A43]"
                    }`}
                    style={{ fontFamily: "Inter" }}>
                    {item.label}
                  </button>
                </div>
              ) : (
                <button key={item.label} onClick={() => { setPage(item.page); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                    currentPage === item.page || item.children?.some(c => c.page === currentPage)
                      ? "text-white bg-[#087F5B]"
                      : "text-white hover:text-[#087F5B] hover:bg-white/5"
                  }`}
                  style={{ fontFamily: "Inter" }}>
                  {item.children?.find(c => c.page === currentPage)?.label || item.label}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}