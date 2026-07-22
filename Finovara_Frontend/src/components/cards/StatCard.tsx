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
import { useCountUp } from "../../hooks/useCountUp";
import { toLocaleString } from "../../../function toLocaleString() { [native code] }";

export function StatCard({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCountUp(value, 2200, started);
  return (
    <div className="text-center group">
      <div className="text-4xl md:text-5xl font-bold text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm font-medium uppercase tracking-widest" style={{ color: "#C8A45D" }}>{label}</div>
    </div>
  );
}