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
import { TESTIMONIALS } from "../../utils/constants";
import { Reveal } from "../../components/animations/Reveal";

export function TestimonialsPage() {
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Stories</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>What Our Clients Say</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Trusted by 1,500+ businesses across India</p>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...TESTIMONIALS, ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.3)] transition-all duration-300 hover:-translate-y-4 group cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                <div className="relative z-10">
                  <Quote size={28} style={{ color: "#087F5B" }} className="mb-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[#52606D] leading-relaxed mb-6 text-sm" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#102A43]" style={{ fontFamily: "Manrope" }}>{t.name}</div>
                      <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{t.role}</div>
                    </div>
                    <div className="ml-auto flex">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={12} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}