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
import { TESTIMONIALS, STATS, FEATURES, SERVICES, INDUSTRIES, WORKFLOW, FEATURED_ASSIGNMENTS, INSIGHTS, COMPLIANCE_CALENDAR, FAQS } from "../../utils/constants";
import { StatCard } from "../../components/cards/StatCard";
import { handleDownloadResource, handleAddCalendar } from "../../utils/helpers";
import { ArticleModal } from "../../components/modals/ArticleModal";
import { Reveal } from "../../components/animations/Reveal";
import heroVideo from "../../assets/videos/Hero_video.mp4";

export function HomePage({ setPage }: { setPage: (p: Page, hash?: string) => void }) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsStarted, setStatsStarted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [activeService, setActiveService] = useState(0);
  const [dotStep, setDotStep] = useState(0);
  const [bouncingStep, setBouncingStep] = useState<number | null>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const [processStarted, setProcessStarted] = useState(false);

  // Dynamic data
  const [liveTestimonials, setLiveTestimonials] = useState<any[]>([]);
  const [liveBlogs, setLiveBlogs] = useState<any[]>([]);
  const [liveDownloads, setLiveDownloads] = useState<any[]>([]);

  useEffect(() => {
    import("../../services/public").then(({ publicApi }) => {
      publicApi.testimonials().then(d => { if (d.length) setLiveTestimonials(d); }).catch(() => {});
      publicApi.blogs().then(d => { if (d.length) setLiveBlogs(d.slice(0, 3)); }).catch(() => {});
      publicApi.downloads().then(d => { if (d.length) setLiveDownloads(d.slice(0, 4)); }).catch(() => {});
    });
  }, []);

  const mappedLiveTestimonials = liveTestimonials
    .filter(t => t.content && t.content.trim())
    .map(t => ({ name: t.author_name, role: t.author_title ?? "", text: t.content, avatar: t.author_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(), rating: t.rating ?? 5 }));
  const displayTestimonials = mappedLiveTestimonials.length ? mappedLiveTestimonials : TESTIMONIALS;

  const displayBlogs = liveBlogs.length
    ? liveBlogs.map(b => ({ title: b.title, tag: b.category_id ?? "Article", date: b.published_at ? new Date(b.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "", excerpt: b.excerpt ?? "", readTime: b.read_time_minutes ? `${b.read_time_minutes} min read` : "", cover: b.cover_image_url, _raw: b }))
    : INSIGHTS.map(i => ({ ...i, cover: null, _raw: i }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsStarted(true); },
      { threshold: 0.2 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % displayTestimonials.length), 5000);
    return () => clearInterval(t);
  }, [displayTestimonials.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setProcessStarted(true); },
      { threshold: 0.3 }
    );
    if (processRef.current) observer.observe(processRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!processStarted) return;
    const total = WORKFLOW.length - 1;
    let current = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const runCycle = () => {
      current = 0;
      setDotStep(0);
      setBouncingStep(0);
      setTimeout(() => setBouncingStep(null), 500);

      const interval = setInterval(() => {
        current += 1;
        setDotStep(current);
        setBouncingStep(current);
        setTimeout(() => setBouncingStep(null), 500);
        if (current >= total) {
          clearInterval(interval);
          timeout = setTimeout(runCycle, 1200);
        }
      }, 900);
    };

    runCycle();
    return () => clearTimeout(timeout);
  }, [processStarted]);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={heroVideo}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 z-10" style={{ background: "rgba(16,42,67,0.78)" }} />

        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 flex items-center min-h-screen">
          <div className="w-full max-w-2xl text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/20 bg-white/10">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#087F5B" }} />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80" style={{ fontFamily: "Inter" }}>
                Chartered Accountants & Financial Advisors
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] mb-6" style={{ fontFamily: "Manrope" }}>
              Financial Clarity for{" "}
              <span style={{ color: "#C8A45D", fontFamily: "Playfair Display", fontStyle: "italic" }}>Confident</span>{" "}
              Business Decisions
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl" style={{ fontFamily: "Inter" }}>
              Professional Tax, Audit, GST, Accounting, Payroll, Compliance, and Virtual CFO solutions delivered through expert guidance and secure digital workflows.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => setPage("book")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:shadow-2xl hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Calendar size={18} />
                Book Consultation
              </button>
              <button onClick={() => setPage("services")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/20 text-white hover:bg-white/10"
                style={{ fontFamily: "Inter" }}>
                Explore Services
                <ChevronRight size={18} />
              </button>
              <button onClick={() => setPage("login")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "Inter" }}>
                <UploadCloud size={16} />
                Upload Documents
              </button>
              <button onClick={() => {
                const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finovara Firm Profile</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #102A43; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px 80px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 52px; margin: 0; font-weight: 800; }
    .header p { font-size: 20px; opacity: 0.8; margin-top: 10px; font-weight: 500; }
    .container { max-width: 900px; margin: -60px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    .hero-img { width: 100%; height: 350px; object-fit: cover; border-radius: 16px; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #102A43; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); transition: transform 0.2s; }
    .card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .card h3 { font-size: 22px; margin-top: 0; color: #102A43; font-family: 'Manrope', sans-serif; }
    .card p { line-height: 1.6; color: #52606D; margin-bottom: 0; }
    .stats { display: flex; justify-content: space-around; background: linear-gradient(135deg, #087F5B, #065a40); color: white; padding: 40px 20px; border-radius: 16px; margin-top: 50px; box-shadow: 0 15px 30px rgba(8,127,91,0.2); }
    .stat-item { text-align: center; }
    .stat-val { font-size: 42px; font-weight: 800; font-family: 'Manrope', sans-serif; margin-bottom: 5px; }
    .stat-lbl { font-size: 15px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .footer { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #EEF1F5; color: #52606D; font-size: 14px; line-height: 1.6; }
    .badges { display: flex; justify-content: center; gap: 15px; margin-bottom: 15px; }
    .badge { background: #EAF4F0; color: #087F5B; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="header">
    <h1>Finovara</h1>
    <p>Chartered Accountants LLP</p>
  </div>
  <div class="container">
    <div class="badges">
      <span class="badge">ICAI Registered</span>
      <span class="badge">ISO 27001 Certified</span>
      <span class="badge">Established 2010</span>
    </div>
    
    <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=600&fit=crop" class="hero-img" alt="Finovara Office">
    
    <h2>About Our Firm</h2>
    <p class="lead">Finovara Chartered Accountants LLP is a premier financial and advisory firm committed to delivering excellence. With over 15 years of experience, we provide a comprehensive suite of services ranging from statutory audits and tax advisory to complex financial structuring and compliance management for enterprises across India.</p>
    
    <h2>Core Competencies</h2>
    <div class="grid">
      <div class="card">
        <h3>Audit & Assurance</h3>
        <p>Robust auditing services ensuring compliance, transparency, and actionable financial insights for private and public companies.</p>
      </div>
      <div class="card">
        <h3>Tax Advisory</h3>
        <p>Strategic tax planning, assessment, and compliance for both direct (Income Tax) and indirect taxation (GST & Customs).</p>
      </div>
      <div class="card">
        <h3>Corporate Finance</h3>
        <p>Expert guidance on capital structuring, mergers, acquisitions, due diligence, and comprehensive business valuations.</p>
      </div>
      <div class="card">
        <h3>Virtual CFO</h3>
        <p>End-to-end financial management, rigorous budgeting, and strategic forecasting tailored for rapidly growing businesses.</p>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-val">15+</div>
        <div class="stat-lbl">Years Experience</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">1,500+</div>
        <div class="stat-lbl">Active Clients</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">4,000+</div>
        <div class="stat-lbl">Tax Filings</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">100%</div>
        <div class="stat-lbl">Compliance</div>
      </div>
    </div>
    
    <div class="footer">
      <strong>Finovara Chartered Accountants LLP</strong><br>
      A global standard of financial excellence and integrity.<br><br>
      Contact: contact@finovara.in | +91 98765 43210 | www.finovara.in
    </div>
  </div>
</body>
</html>`;
                const element = document.createElement("a");
                const file = new Blob([htmlContent], {type: 'text/html'});
                element.href = URL.createObjectURL(file);
                element.download = "Finovara_Firm_Profile.html";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "Inter" }}>
                <Download size={16} />
                Download Firm Profile
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-white/10">
              {["ICAI Registered", "ISO 27001 Certified", "15+ Years Experience"].map(badge => (
                <div key={badge} className="flex items-center gap-2">
                  <CheckCircle size={16} style={{ color: "#087F5B" }} />
                  <span className="text-sm text-white/60 font-medium" style={{ fontFamily: "Inter" }}>{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="#102A43" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-20" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Our Impact</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "Manrope" }}>Numbers That Define Our Excellence</h2>
          </div>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
            {STATS.map((s) => (
              <StatCard key={s.label} value={s.value} suffix={s.suffix} label={s.label} started={statsStarted} />
            ))}
          </div>
          </Reveal>

        </div>
      </section>

      {/* Why Choose Finovara */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <div className="max-w-2xl mb-16 mx-auto text-center">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Why Finovara</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight" style={{ fontFamily: "Manrope" }}>
              The Standard for Modern{" "}
              <span style={{ color: "#087F5B" }}>Financial Advisory</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed" style={{ fontFamily: "Inter" }}>
              We combine deep domain expertise with secure digital infrastructure to deliver compliance and advisory services that keep your business ahead.
            </p>
          </div>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {FEATURES.map(({ icon: Icon, title }) => (
              <div key={title} className="flex flex-col items-center text-center gap-4 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.15)] transition-all duration-300 hover:-translate-y-4 group cursor-default relative overflow-hidden">
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 group-hover:bg-[#EAF4F0] transition-colors group-hover:scale-110 relative z-10">
                  <Icon size={24} className="text-gray-500 group-hover:text-[#087F5B] transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm relative z-10" style={{ fontFamily: "Manrope" }}>{title}</h3>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>What We Do</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Core Service Offerings</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Comprehensive financial and compliance services, delivered by qualified professionals with sector-specific expertise.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title}
                onMouseEnter={() => setActiveService(i)}
                onClick={() => {
                  window.sessionStorage.setItem("activeService", i.toString());
                  window.dispatchEvent(new Event("serviceChanged"));
                  setPage("services");
                }}
                className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-300 ${activeService === i ? "border-[#087F5B] shadow-xl scale-105" : "border-gray-200 hover:border-[#087F5B]"}`}
                style={{ background: activeService === i ? "linear-gradient(135deg, #102A43, #0d3355)" : "white" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: activeService === i ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                  <Icon size={20} style={{ color: activeService === i ? "#C8A45D" : "#087F5B" }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ fontFamily: "Manrope", color: activeService === i ? "white" : "#102A43" }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ fontFamily: "Inter", color: activeService === i ? "rgba(255,255,255,0.6)" : "#52606D" }}>{desc}</p>
                {activeService === i && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    window.sessionStorage.setItem("activeService", i.toString());
                    window.dispatchEvent(new Event("serviceChanged"));
                    setPage("services");
                  }} className="flex items-center gap-1 mt-3 text-xs font-semibold cursor-pointer" style={{ color: "#C8A45D" }}>
                    Learn More <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => setPage("services")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm hover:bg-[#087F5B] hover:text-white transition-all cursor-pointer"
              style={{ fontFamily: "Inter" }}>
              View All Services <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Industries</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Sectors We Serve</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
              Deep domain knowledge across 15+ industries with tailored compliance and financial strategies.
            </p>
          </div>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => {
                window.sessionStorage.setItem("activeIndustry", label);
                window.dispatchEvent(new Event("industryChanged"));
                setPage("industries");
              }}
                className="group flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.15)] transition-all duration-300 hover:-translate-y-4 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center relative z-10" style={{ background: "#EAF4F0" }}>
                  <Icon size={24} style={{ color: "#087F5B" }} className="group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-sm font-semibold text-center text-gray-900 relative z-10" style={{ fontFamily: "Manrope" }}>{label}</span>
              </button>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Our Process</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>How We Deliver Excellence</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
              A transparent, structured workflow that keeps you informed at every step.
            </p>
          </div>
          <div ref={processRef} className="relative">
            {/* Static track line */}
            <div className="absolute top-8 left-[6.25%] right-[6.25%] h-1 hidden lg:block rounded-full" style={{ background: "#E2E8F0" }} />
            {/* Animated fill line */}
            <div
              className="absolute top-8 left-[6.25%] h-1 hidden lg:block rounded-full transition-all duration-700 ease-in-out"
              style={{
                background: "linear-gradient(90deg, #087F5B, #2F9E44)",
                width: processStarted ? `${(dotStep / (WORKFLOW.length - 1)) * 87.5}%` : "0%",
              }}
            />
            {/* Moving dot — hidden when exactly on a node */}
            {processStarted && (() => {
              const pct = (dotStep / (WORKFLOW.length - 1)) * 87.5;
              const isOnNode = WORKFLOW.some((_, i) => Math.abs(pct - (i / (WORKFLOW.length - 1)) * 87.5) < 0.01);
              return !isOnNode ? (
                <div
                  className="absolute top-[22px] hidden lg:block w-4 h-4 rounded-full border-2 border-white shadow-lg z-20 transition-all duration-700 ease-in-out"
                  style={{
                    background: "#087F5B",
                    left: `calc(6.25% + ${pct}% - 8px)`,
                    boxShadow: "0 0 0 4px rgba(8,127,91,0.25)",
                  }}
                />
              ) : null;
            })()}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {WORKFLOW.map(({ step, title, desc }, i) => (
                <div
                  key={step}
                  className="flex flex-col items-center text-center"
                  style={{
                    transform: bouncingStep === i ? "scale(1.15) translateY(-8px)" : "scale(1) translateY(0)",
                    transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2 shadow-sm z-10"
                    style={{
                      background: i <= dotStep ? "white" : "#F8FAFC",
                      borderColor: i <= dotStep ? "#087F5B" : "rgba(8,127,91,0.2)",
                      boxShadow: i <= dotStep ? "0 4px 12px rgba(8,127,91,0.2)" : undefined,
                      transition: "border-color 0.3s, box-shadow 0.3s",
                    }}
                  >
                    <span className="font-bold text-lg" style={{ fontFamily: "Manrope", color: "#087F5B" }}>{step}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1" style={{ fontFamily: "Manrope" }}>{title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed hidden md:block" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Client Portal Preview */}
      <section className="py-24 overflow-hidden" style={{ background: "linear-gradient(135deg, #102A43 0%, #0d3355 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Portal</p>
            <h2 className="text-4xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              Your Financial Hub,<br />
              <span style={{ color: "#087F5B" }}>Always Accessible</span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              A secure, feature-rich portal giving you real-time visibility into compliance status, document management, and service progress.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: BarChart2, label: "Live Dashboard" },
                { icon: Folder, label: "Document Vault" },
                { icon: Calendar, label: "Compliance Calendar" },
                { icon: FileText, label: "Report Center" },
                { icon: Bell, label: "Smart Alerts" },
                { icon: Shield, label: "Secure Uploads" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.2)" }}>
                    <Icon size={16} style={{ color: "#087F5B" }} />
                  </div>
                  <span className="text-sm font-medium text-white/80" style={{ fontFamily: "Inter" }}>{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setPage("login")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Access Your Portal <ArrowRight size={16} />
            </button>
          </div>
          <div className="hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&fit=crop&auto=format"
              alt="Financial dashboard showing analytics and compliance tracking"
              className="rounded-3xl shadow-2xl border border-white/10 w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured Advisory Assignments */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Case Studies</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Featured Advisory Assignments</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>Real-world impact delivered through strategic financial expertise.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURED_ASSIGNMENTS.map((assignment, i) => (
              <div key={i} className="flex flex-col bg-white rounded-3xl p-8 border-2 border-[#E2E8F0] hover:border-[#087F5B] hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6" style={{ background: "linear-gradient(135deg, #087F5B15, #087F5B30)", color: "#087F5B", fontFamily: "Inter" }}>
                  {assignment.tag}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>{assignment.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm flex-1" style={{ fontFamily: "Inter" }}>{assignment.desc}</p>
                <div className="pt-6 border-t border-gray-200 mt-6">
                  <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: "Inter" }}>Key Outcome</div>
                  <div className="font-bold text-[#087F5B]" style={{ fontFamily: "Manrope" }}>{assignment.metric}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Client Stories</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Trusted by Industry Leaders</h2>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-200 shadow-xl">
              <Quote size={40} style={{ color: "#087F5B" }} className="mb-6 opacity-30" />
              <p className="text-xl md:text-2xl text-gray-900 leading-relaxed mb-8 font-medium" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>
                "{displayTestimonials[activeTestimonial]?.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                  {displayTestimonials[activeTestimonial]?.avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-900" style={{ fontFamily: "Manrope" }}>{displayTestimonials[activeTestimonial]?.name}</div>
                  <div className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>{displayTestimonials[activeTestimonial]?.role}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  {Array.from({ length: displayTestimonials[activeTestimonial]?.rating ?? 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              {displayTestimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === activeTestimonial ? 24 : 8, height: 8, background: i === activeTestimonial ? "#087F5B" : "#E2E8F0" }} />
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setPage("testimonials")}
              className="text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
              Read All Testimonials →
            </button>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Knowledge Hub</p>
              <h2 className="text-4xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>Latest Insights</h2>
            </div>
            <button onClick={() => setPage("insights")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
              View All Articles <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {displayBlogs.map((article, idx) => (
              <div key={article.title + idx} className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 overflow-hidden bg-[#EEF1F5]">
                  <img
                    src={article.cover || article.image || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format"}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{article.tag}</span>
                    <span className="text-xs text-gray-500" style={{ fontFamily: "Inter" }}>{article.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500" style={{ fontFamily: "Inter" }}>{article.readTime}</span>
                    <button onClick={() => setSelectedArticle(article._raw ?? article)} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
                      Read More <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Free Resources</p>
            <h2 className="text-4xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>Tools & Downloads</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(liveDownloads.length ? liveDownloads : [
              { id: "1", title: "Firm Profile", description: "Complete overview of Finovara services and expertise", file_url: null },
              { id: "2", title: "Compliance Checklist", description: "Monthly compliance calendar for FY 2024-25", file_url: null },
              { id: "3", title: "Tax Guide 2025", description: "Comprehensive guide to new tax regime changes", file_url: null },
              { id: "4", title: "Startup Handbook", description: "Step-by-step incorporation and compliance guide", file_url: null },
            ]).map((item) => (
              <div key={item.id} onClick={() => item.file_url && window.open(item.file_url, "_blank", "noopener")} className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#087F5B] hover:shadow-lg transition-all cursor-pointer">
                <Download size={28} style={{ color: "#087F5B" }} className="mb-4" />
                <h4 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Manrope" }}>{item.title}</h4>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>{item.description}</p>
                <button className="flex items-center gap-1 mt-4 text-xs font-semibold text-[#087F5B]" style={{ fontFamily: "Inter" }}>
                  Download Free <Download size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Calendars */}
      <section className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Stay Compliant</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Upcoming Compliance Deadlines</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>Never miss a deadline. Keep track of crucial tax and regulatory filings.</p>
          </div>
          <div className="max-w-4xl mx-auto bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm">
            <div className="space-y-4">
              {COMPLIANCE_CALENDAR.map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-2xl bg-white border border-gray-200 hover:border-[#087F5B] transition-all hover:shadow-md">
                  <div className="flex-shrink-0 text-center md:w-32 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-4">
                    <div className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>{item.date.split(' ')[0]}</div>
                    <div className="text-sm font-semibold text-[#087F5B] uppercase tracking-wide" style={{ fontFamily: "Inter" }}>{item.date.split(' ')[1]}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "Manrope" }}>{item.task}</h4>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{item.type}</span>
                    </div>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>{item.desc}</p>
                  </div>
                  <button onClick={() => handleAddCalendar(item)} className="self-start md:self-center px-4 py-2 rounded-xl text-xs font-semibold border-2 border-[#087F5B] text-[#087F5B] hover:bg-[#087F5B] hover:text-white transition-all flex-shrink-0 cursor-pointer" style={{ fontFamily: "Inter" }}>
                    Add to Calendar
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center border-t border-gray-200 pt-8">
              <button onClick={() => handleDownloadResource("Compliance Checklist")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 shadow-md hover:shadow-xl cursor-pointer" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Download size={16} /> Download Full FY24-25 Calendar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>FAQs</p>
            <h2 className="text-4xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left group cursor-pointer hover:bg-gray-50">
                  <span className="font-semibold text-gray-900 pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                  <div className="flex-shrink-0">
                    {openFaq === i ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-600 leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setPage("faqs")}
              className="text-sm font-semibold text-[#087F5B] hover:underline cursor-pointer" style={{ fontFamily: "Inter" }}>
              View All FAQs →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #087F5B 0%, #065a40 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-white/10 border border-white/20">
            <Calendar size={14} className="text-white/70" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70" style={{ fontFamily: "Inter" }}>Free Consultation</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
            Ready to Transform Your<br />
            <span style={{ fontFamily: "Playfair Display", fontStyle: "italic", color: "#C8A45D" }}>Financial Strategy?</span>
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
            Schedule a no-obligation consultation with our senior advisors. Get expert guidance tailored to your business in 30 minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setPage("book")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 font-semibold text-white text-base hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ fontFamily: "Inter" }}>
              <Calendar size={18} />
              Book Free Consultation
            </button>
            <button onClick={() => setPage("contact")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all cursor-pointer"
              style={{ fontFamily: "Inter" }}>
              <Phone size={18} />
              Call Us Now
            </button>
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}