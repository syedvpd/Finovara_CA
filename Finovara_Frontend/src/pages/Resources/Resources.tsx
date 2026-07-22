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
import { handleDownloadResource } from "../../utils/helpers";

export function ResourcesPage() {
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Downloads</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Free Resources</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Tools, guides, and checklists to support your compliance journey</p>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Firm Profile 2025", type: "PDF", size: "2.4 MB", desc: "Complete overview of Finovara services, team, and track record." },
              { title: "Tax Compliance Calendar FY 2024-25", type: "PDF", size: "1.1 MB", desc: "Month-by-month compliance deadline tracker." },
              { title: "Startup Compliance Checklist", type: "Excel", size: "0.8 MB", desc: "Complete checklist for new startup regulatory requirements." },
              { title: "GST Return Filing Guide", type: "PDF", size: "3.2 MB", desc: "Step-by-step guide to GST return preparation and filing." },
              { title: "Income Tax Planning Workbook", type: "Excel", size: "1.5 MB", desc: "Interactive workbook for optimizing tax liability." },
              { title: "Annual Audit Preparation Kit", type: "PDF", size: "4.1 MB", desc: "Comprehensive documents checklist for statutory audit." },
            ].map(({ title, type, size, desc }) => (
              <div key={title} className="group bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B]/20 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                    <FileText size={22} style={{ color: "#087F5B" }} />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{type}</span>
                    <span className="text-xs text-[#94A3B8] px-2 py-1 rounded-lg bg-[#EEF1F5]" style={{ fontFamily: "Inter" }}>{size}</span>
                  </div>
                </div>
                <h3 className="font-bold text-[#102A43] mb-2" style={{ fontFamily: "Manrope" }}>{title}</h3>
                <p className="text-sm text-[#52606D] mb-4" style={{ fontFamily: "Inter" }}>{desc}</p>
                <button onClick={() => handleDownloadResource(title)} className="flex items-center gap-2 text-sm font-semibold text-[#087F5B] group-hover:underline" style={{ fontFamily: "Inter" }}>
                  <Download size={16} /> Download Free
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}