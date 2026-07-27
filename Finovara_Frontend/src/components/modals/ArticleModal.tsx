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

export function ArticleModal({ article, onClose }: { article: any, onClose: () => void }) {
  if (!article) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-black/50 hover:text-black">
          <X size={24} />
        </button>
        <div className="mb-6">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EAF4F0] text-[#087F5B] mb-4 inline-block" style={{ fontFamily: "Inter" }}>{article.tag}</span>
          <h2 className="text-3xl font-extrabold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>{article.title}</h2>
          <div className="flex items-center gap-4 text-sm text-[#64748B]" style={{ fontFamily: "Inter" }}>
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime}</span>
          </div>
        </div>
        <div className="h-64 rounded-xl overflow-hidden mb-8 bg-[#EEF1F5]">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop" alt="Article Cover" className="w-full h-full object-cover" />
        </div>
        <div className="text-sm" style={{ fontFamily: "Inter", color: "#334155", lineHeight: 1.8 }}>
          <p className="text-lg font-medium mb-6 text-[#475569]">{article.excerpt}</p>
          <p className="mb-4">This is a full dynamic view for the article. In a production environment, this would load the complete rich-text content from a CMS. For now, it dynamically adapts to the title and tags of the insight you clicked.</p>
          <h3 className="text-lg font-bold mt-8 mb-4 text-[#102A43]">Key Takeaways</h3>
          <ul className="list-disc pl-5 mb-6 space-y-2 text-[#475569]">
            <li>Detailed compliance requirements for the upcoming financial year.</li>
            <li>Strategic insights on minimizing tax liability through proper structuring.</li>
            <li>Updates on the latest regulatory changes affecting mid-sized enterprises.</li>
          </ul>
          <button onClick={onClose} className="mt-6 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 w-full" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
            Close Article
          </button>
        </div>
      </div>
    </div>
  );
}