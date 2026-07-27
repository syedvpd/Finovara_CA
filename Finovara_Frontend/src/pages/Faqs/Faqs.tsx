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
import { FAQS } from "../../utils/constants";

export function FaqsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const allFaqs = [...FAQS, ...FAQS.slice(0, 4)];
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Help Center</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Frequently Asked Questions</h1>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
          {allFaqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="font-semibold text-[#102A43] pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                {openFaq === i ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-[#334155] leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}