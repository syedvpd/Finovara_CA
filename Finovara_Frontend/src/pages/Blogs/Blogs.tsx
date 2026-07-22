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
import { INSIGHTS } from "../../utils/constants";
import { ArticleModal } from "../../components/modals/ArticleModal";

export function BlogsPage() {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Blog</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Financial Insights Blog</h1>
            <p className="text-white/70" style={{ fontFamily: "Inter" }}>Expert commentary, tax updates, and compliance guidance from our advisory team.</p>
          </div>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Featured */}
          <div className="mb-12 bg-white rounded-3xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all grid md:grid-cols-2">
            <img src="https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=600&h=400&fit=crop&auto=format" alt="Budget 2025 analysis" className="w-full h-full object-cover" />
            <div className="p-8 flex flex-col justify-center">
              <span className="text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block self-start" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>Featured Article</span>
              <h2 className="text-3xl font-extrabold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>Budget 2025: Everything Your Business Needs to Know</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-6" style={{ fontFamily: "Inter" }}>A comprehensive breakdown of every financial measure in Union Budget 2025 that directly impacts Indian businesses.</p>
              <button onClick={() => setSelectedArticle({ title: "Budget 2025: Everything Your Business Needs to Know", tag: "Tax Update", date: "15 Jan 2025", readTime: "8 min read", excerpt: "A comprehensive breakdown of every financial measure in Union Budget 2025 that directly impacts Indian businesses." })} className="inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B]" style={{ fontFamily: "Inter" }}>Read Full Article <ArrowRight size={14} /></button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIGHTS.map((article, i) => (
              <div key={i} className="group bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 bg-[#EEF1F5] overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format`} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B" }}>{article.tag}</span>
                  </div>
                  <h3 className="font-bold text-[#102A43] mb-2 leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                    <span>{article.readTime}</span>
                    <button onClick={() => setSelectedArticle(article)} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline">Read Full Article <ArrowRight size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}