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

export function AnnouncementBar({ setPage }: { setPage: (p: Page) => void }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2 text-xs font-medium relative" style={{ background: "linear-gradient(90deg, #087F5B, #065a40)", color: "white" }}>
      <span style={{ fontFamily: "Inter" }}>
        <span className="font-semibold">New:</span> Budget 2025 — Key Changes Affecting Your Business.{" "}
        <button onClick={() => setPage("insights")} className="underline underline-offset-2 hover:no-underline">Read Our Analysis →</button>
      </span>
      <button onClick={() => setVisible(false)} className="absolute right-4 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}