"use client";

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

export function Footer({ setPage }: { setPage: (p: Page) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubscribe = () => {
    setError("");
    setSuccess(false);
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setError("Invalid email format");
      return;
    }
    setSuccess(true);
    setEmail("");
    setTimeout(() => setSuccess(false), 3000);
  };
  return (
    <footer style={{ background: "#102A43" }}>
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
                <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
              </div>
              <div>
                <span className="font-bold text-lg text-white" style={{ fontFamily: "Manrope" }}>Finovara</span>
                <span className="block text-xs" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>Chartered Accountants LLP</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>
              Clarity in Finance. Confidence in Growth. Trusted financial expertise for every stage of your business journey.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Linkedin, url: "https://linkedin.com/company/finovara" },
                { Icon: Twitter, url: "https://twitter.com/finovara" },
                { Icon: Instagram, url: "https://instagram.com/finovara" },
                { Icon: Youtube, url: "https://youtube.com/finovara" },
                { Icon: Facebook, url: "https://facebook.com/finovara" }
              ].map(({ Icon, url }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Icon size={15} style={{ color: "rgba(255,255,255,0.5)" }} />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Services</div>
            <div className="space-y-2">
              {[
                { title: "Income Tax", index: 0 },
                { title: "GST Services", index: 1 },
                { title: "Audit & Assurance", index: 2 },
                { title: "Virtual CFO", index: 6 },
                { title: "Payroll", index: 5 },
                { title: "Company Incorporation", index: 4 }
              ].map(s => (
                <button key={s.title} onClick={() => {
                  window.sessionStorage.setItem("activeService", s.index.toString());
                  window.dispatchEvent(new Event("serviceChanged"));
                  setPage("services");
                }} className="block text-sm hover:text-white transition-colors cursor-pointer" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>{s.title}</button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Company</div>
            <div className="space-y-2">
              {[
                { label: "About Us", page: "about" as Page },
                { label: "Industries", page: "industries" as Page },
                { label: "Insights", page: "insights" as Page },
                { label: "Careers", page: "careers" as Page },
                { label: "Contact", page: "contact" as Page },
              ].map(({ label, page }) => (
                <button key={label} onClick={() => setPage(page)} className="block text-sm hover:text-white transition-colors cursor-pointer" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Contact</div>
            <div className="space-y-3">
              <a href="tel:+912267890123" className="flex items-start gap-2 group cursor-pointer transition-colors hover:opacity-80">
                <Phone size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm group-hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>+91 22 6789 0123</span>
              </a>
              <a href="mailto:hello@finovara.in" className="flex items-start gap-2 group cursor-pointer transition-colors hover:opacity-80">
                <Mail size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm group-hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>hello@finovara.in</span>
              </a>
              <a href="https://maps.google.com/?q=Finovara+Hyderabad+Telangana" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group cursor-pointer transition-colors hover:opacity-80">
                <MapPin size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm group-hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>Hyderabad, Telangana</span>
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Newsletter</div>
            <p className="text-xs mb-4" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>
              Tax updates, compliance alerts, and financial insights — delivered monthly.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="Your email"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} text-white placeholder:text-white/30 outline-none focus:border-[#087F5B]`}
                  style={{ fontFamily: "Inter" }} />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                {success && <p className="text-green-400 text-xs mt-1">Subscribed successfully!</p>}
              </div>
              <button onClick={handleSubscribe} className="p-2.5 rounded-xl flex-shrink-0 self-start cursor-pointer hover:bg-[#065a40] transition-colors" style={{ background: "#087F5B" }}>
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>
            © 2025 Finovara Chartered Accountants LLP. All rights reserved. ICAI Firm Reg. No. 123456W.
          </p>
          <div className="flex gap-6 items-center">
            {["Privacy Policy", "Terms of Use", "Cookie Policy", "Disclaimer"].map(link => (
              <button key={link} onClick={() => {
                if (link === "Privacy Policy") setPage("privacy");
                if (link === "Terms of Use") setPage("terms");
              }} className="text-xs hover:text-white transition-colors cursor-pointer" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>{link}</button>
            ))}
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="ml-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-[#087F5B] hover:border-[#087F5B] hover:-translate-y-2 hover:shadow-[0_8px_16px_rgba(8,127,91,0.4)] cursor-pointer group"
              title="Back to top">
              <ChevronUp size={20} className="transition-transform duration-300 group-hover:-translate-y-1" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}