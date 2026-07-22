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
import { Reveal } from "../../components/animations/Reveal";

export function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  const team = [
    { name: "CA Arjun Mehta", role: "Managing Partner", exp: "22 Years", spec: "Direct Tax & Audit", initials: "AM" },
    { name: "CA Priya Nair", role: "Senior Partner", exp: "18 Years", spec: "GST & Indirect Tax", initials: "PN" },
    { name: "CA Suresh Kumar", role: "Partner – Advisory", exp: "15 Years", spec: "Virtual CFO & Strategy", initials: "SK" },
    { name: "CA Divya Rao", role: "Partner – Audit", exp: "14 Years", spec: "Audit & Assurance", initials: "DR" },
  ];

  const values = [
    { icon: Target, title: "Accuracy", desc: "Precise and error-free financial reporting." },
    { icon: UserCheck, title: "Professional Integrity", desc: "Uncompromising ethical standards in all dealings." },
    { icon: Lock, title: "Confidentiality", desc: "Strict protection of client data and privacy." },
    { icon: Search, title: "Transparency", desc: "Clear and open communication at every step." },
    { icon: Clock, title: "Timely Compliance", desc: "Adhering strictly to all deadlines and regulations." },
    { icon: Flag, title: "Accountability", desc: "Taking ownership of outcomes and client trust." },
    { icon: TrendingUp, title: "Client Success", desc: "Dedicated to driving your business growth." },
    { icon: Heart, title: "Ethical Practice", desc: "Commitment to doing the right thing, always." },
    { icon: Shield, title: "Data Security", desc: "Ensuring top-tier protection for sensitive information." },
    { icon: BookOpen, title: "Continuous Learning", desc: "Staying ahead of regulatory and industry shifts." },
    { icon: FileCheck, title: "Regulatory Discipline", desc: "Rigorous adherence to statutory frameworks." },
    { icon: PieChart, title: "Financial Excellence", desc: "Delivering superior financial strategies and outcomes." }
  ];

  return (
    <div className="pt-16" style={{ background: "#ffffff" }}>
      {/* Hero */}
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>About Finovara</p>
            <h1 className="text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              A Decade of Financial{" "}
              <span style={{ color: "#C8A45D" }}>Excellence</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-6" style={{ fontFamily: "Inter" }}>
              Finovara Chartered Accountants LLP was founded with a singular mission: to democratise access to world-class financial advisory services for businesses of every size.
            </p>
            <p className="text-white/60 leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              From our foundation as a boutique tax practice, we have grown into a comprehensive financial services firm with 65+ professionals serving 1,500+ clients across 15 sectors. Our journey has been defined by one unwavering principle: putting our clients' financial health first.
            </p>
            <button onClick={() => setPage("book")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Meet Our Team <ArrowRight size={16} />
            </button>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=450&fit=crop&auto=format"
              alt="Finovara team in a professional office setting"
              className="rounded-3xl shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Vision Mission */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 border border-white/10" style={{ background: "#EAF4F0" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#087F5B" }}>
              <Target size={22} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#102A43] mb-3" style={{ fontFamily: "Manrope" }}>Our Vision</h3>
            <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>
              To be India's most trusted financial advisory firm, empowering businesses with the clarity, compliance, and strategic insight needed to achieve sustainable growth.
            </p>
          </div>
          <div className="rounded-3xl p-8 border border-white/10" style={{ background: "#F7F4EE" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#C8A45D" }}>
              <Lightbulb size={22} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#102A43] mb-3" style={{ fontFamily: "Manrope" }}>Our Mission</h3>
            <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>
              To deliver exceptional, technology-enabled financial and compliance services with absolute integrity, helping clients navigate complexity and make decisions with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-black" style={{ fontFamily: "Manrope" }}>Core Values</h2>
          </div>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.3)] transition-all duration-300 hover:-translate-y-4 text-center group cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110 relative z-10" style={{ background: "#EAF4F0" }}>
                  <Icon size={24} style={{ color: "#087F5B" }} />
                </div>
                <h4 className="font-bold text-[#102A43] mb-2 text-lg relative z-10" style={{ fontFamily: "Manrope" }}>{title}</h4>
                <p className="text-sm text-[#94A3B8] leading-relaxed relative z-10" style={{ fontFamily: "Inter" }}>{desc}</p>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Leadership</p>
            <h2 className="text-4xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>Our Senior Partners</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map(({ name, role, exp, spec, initials }) => (
              <div key={name} className="group bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white mb-4"
                  style={{ background: "linear-gradient(135deg, #102A43, #087F5B)", fontFamily: "Manrope" }}>
                  {initials}
                </div>
                <h4 className="font-bold text-[#102A43] mb-1" style={{ fontFamily: "Manrope" }}>{name}</h4>
                <p className="text-sm font-medium mb-2" style={{ color: "#087F5B", fontFamily: "Inter" }}>{role}</p>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} style={{ color: "#94A3B8" }} />
                  <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{exp} Experience</span>
                </div>
                <p className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{spec}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>Our Offices</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Strategically located to serve businesses across India with local expertise and global standards.
            </p>
          </div>

          {/* Headquarters */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#087F5B]/20 shadow-[0_8px_30px_rgba(8,127,91,0.08)] relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#087F5B]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 bg-[#EAF4F0] text-[#087F5B] text-xs font-bold rounded-full uppercase tracking-wider">Headquarters</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
                  <Building2 size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-[#102A43] mb-2" style={{ fontFamily: "Manrope" }}>Hyderabad, Telangana, India</h3>
                  <div className="flex items-center gap-2 text-[#94A3B8] text-sm" style={{ fontFamily: "Inter" }}>
                    <MapPin size={16} className="text-[#087F5B]" />
                    <span>Serving as our central command for national operations.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Branch Offices */}
          <h3 className="text-xl font-extrabold text-white mb-6 text-center" style={{ fontFamily: "Manrope" }}>Branch Offices</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              "Hyderabad",
              "Bengaluru",
              "Vijayawada",
              "Visakhapatnam",
              "Chennai",
              "Pune"
            ].map((city) => (
              <div key={city} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B]/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-default">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#102A43] group-hover:bg-[#EAF4F0] transition-colors">
                    <MapPin size={20} className="text-[#94A3B8] group-hover:text-[#087F5B] transition-colors" />
                  </div>
                  <div>
                    <div className="font-bold text-[#102A43] text-lg" style={{ fontFamily: "Manrope" }}>{city}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5 font-medium" style={{ fontFamily: "Inter" }}>Branch Office</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}