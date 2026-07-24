import { useState, useEffect, useRef, useCallback } from "react";
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
import { INDUSTRIES, INDUSTRY_DETAILS } from "../../utils/constants";

export function IndustriesPage({ setPage }: { setPage: (p: Page) => void }) {
  const [activeIndustry, setActiveIndustry] = useState<string>(() => {
    const saved = window.sessionStorage.getItem("activeIndustry");
    if (saved) {
      window.sessionStorage.removeItem("activeIndustry");
      return saved;
    }
    return INDUSTRIES[0].label;
  });

  useEffect(() => {
    const handleIndustryChange = () => {
      const saved = window.sessionStorage.getItem("activeIndustry");
      if (saved) {
        window.sessionStorage.removeItem("activeIndustry");
        setActiveIndustry(saved);
      }
    };
    window.addEventListener("industryChanged", handleIndustryChange);
    return () => window.removeEventListener("industryChanged", handleIndustryChange);
  }, []);

  const activeIcon = INDUSTRIES.find(i => i.label === activeIndustry);
  const details = INDUSTRY_DETAILS[activeIndustry];

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Industries</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Sectors We Specialise In</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
            Industry-specific financial expertise across 16 sectors, with dedicated teams who understand your regulatory landscape.
          </p>
        </div>
      </section>

      <section className="py-16" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Industry Filter Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setActiveIndustry(label)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  activeIndustry === label
                    ? "text-white border-transparent shadow-lg scale-105"
                    : "bg-white text-[#102A43] border-[#E2E8F0] hover:border-[#087F5B]/30 hover:bg-[#EAF4F0]"
                }`}
                style={activeIndustry === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
              >
                <Icon size={15} style={{ color: activeIndustry === label ? "white" : "#087F5B" }} />
                {label}
              </button>
            ))}
          </div>

          {/* Industry Detail Panel */}
          {details && activeIcon && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl overflow-hidden transition-all">
              {/* Panel Header */}
              <div className="p-8 border-b border-white/10" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.3)" }}>
                    <activeIcon.icon size={30} style={{ color: "#C8A45D" }} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{activeIndustry}</h2>
                    <p className="text-white/60 text-sm mt-1" style={{ fontFamily: "Inter" }}>
                      Specialized compliance, tax advisory, and financial management services tailored for {activeIndustry.toLowerCase()} businesses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Body */}
              <div className="p-8 grid md:grid-cols-2 gap-8" style={{ background: "#ffffff" }}>
                {/* Services */}
                <div>
                  <h4 className="font-bold text-black mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                      <CheckCircle size={14} style={{ color: "#087F5B" }} />
                    </span>
                    Services We Offer
                  </h4>
                    <div className="space-y-2">
                    {details.services.map((s: string) => (
                      <div key={s} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#087F5B]/20 transition-colors">
                        <CheckCircle size={14} style={{ color: "#087F5B" }} className="flex-shrink-0" />
                        <span className="text-sm font-medium text-[#102A43]" style={{ fontFamily: "Inter" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <h4 className="font-bold text-black mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#FFF4E0" }}>
                      <Shield size={14} style={{ color: "#C8A45D" }} />
                    </span>
                    Compliance Areas
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {details.compliance.map((c: string) => (
                      <span key={c} className="px-3 py-2 rounded-xl text-sm font-semibold border" style={{ background: "#102A43", color: "white", borderColor: "rgba(0,0,0,0.06)", fontFamily: "Inter" }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
                    <p className="text-white/70 text-sm mb-4" style={{ fontFamily: "Inter" }}>
                      Get dedicated {activeIndustry} expertise from our specialist team.
                    </p>
                    <button onClick={() => setPage("book")}
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                      Book a Free Consultation →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Don't See Your Industry?</h2>
          <p className="text-white/80 mb-8" style={{ fontFamily: "Inter" }}>We work with businesses across all sectors. Contact us to discuss your specific needs.</p>
          <button onClick={() => setPage("contact")}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#087F5B] font-semibold text-base shadow-lg hover:shadow-xl hover:bg-gray-50 hover:-translate-y-0.5 transition-all cursor-pointer"
            style={{ fontFamily: "Inter" }}>
            Get in Touch
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
