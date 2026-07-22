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

export function InsightsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const tabs = ["all", "Tax", "GST", "Audit", "Advisory", "Startup"];
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const displayInsights = activeTab === "all" 
    ? [...INSIGHTS, ...INSIGHTS].slice(0, 6)
    : [...INSIGHTS, ...INSIGHTS].filter(a => a.tag.toLowerCase().includes(activeTab.toLowerCase())).slice(0, 6);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Knowledge Hub</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Insights & Analysis</h1>
            <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>
              Expert commentary on tax, compliance, and financial strategy from our senior advisory team.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "#087F5B" : "white",
                  color: activeTab === tab ? "white" : "#52606D",
                  fontFamily: "Inter",
                  border: "1px solid",
                  borderColor: activeTab === tab ? "#087F5B" : "rgba(0,0,0,0.08)"
                }}>
                {tab === "all" ? "All Topics" : tab}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {displayInsights.map((article, i) => (
              <div key={i} className="group bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 overflow-hidden bg-[#EEF1F5]">
                  <img
                    src={`https://images.unsplash.com/photo-${i % 2 === 0 ? "1554224155-6726b3ff858f" : "1486406146926-c627a92ad1ab"}?w=400&h=200&fit=crop&auto=format`}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>
                      {article.tag}
                    </span>
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.date}</span>
                  </div>
                  <h3 className="font-bold text-[#102A43] mb-2 text-lg leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.readTime}</span>
                    <button onClick={() => setSelectedArticle(article)} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline">Read More <ArrowRight size={12} /></button>
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