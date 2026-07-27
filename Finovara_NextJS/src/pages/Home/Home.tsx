"use client";
import { useState, useEffect, useRef } from "react";
import {
  ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Shield, Clock,
  FileText, BarChart2, Users, CheckCircle, Building2, Star, Quote, Download,
  Lock, Bell, Folder, TrendingUp, Calendar, BookOpen, Heart, Linkedin,
  Twitter, Instagram, Youtube, Facebook, PieChart, FileCheck, UserCheck,
  AlertCircle, Target, Layers, Cpu, Lightbulb, Flag, UploadCloud
} from "lucide-react";
import { TESTIMONIALS, STATS, FEATURES, SERVICES, INDUSTRIES, WORKFLOW, FEATURED_ASSIGNMENTS, INSIGHTS, COMPLIANCE_CALENDAR, FAQS } from "@/utils/constants";
import { StatCard } from "@/components/cards/StatCard";
import { handleDownloadResource, handleAddCalendar } from "@/utils/helpers";
import { ArticleModal } from "@/components/modals/ArticleModal";
import { Reveal } from "@/components/animations/Reveal";
import { useNavigate } from "@/hooks/useNavigate";

export function HomePage() {
  const navigate = useNavigate();
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
  const [liveTestimonials, setLiveTestimonials] = useState<any[]>([]);
  const [liveBlogs, setLiveBlogs] = useState<any[]>([]);
  const [liveDownloads, setLiveDownloads] = useState<any[]>([]);

  useEffect(() => {
    import("@/services/public").then(({ publicApi }) => {
      publicApi.testimonials().then(d => { if (d.length) setLiveTestimonials(d); }).catch(() => {});
      publicApi.blogs().then(d => { if (d.length) setLiveBlogs(d.slice(0, 3)); }).catch(() => {});
      publicApi.downloads().then(d => { if (d.length) setLiveDownloads(d.slice(0, 4)); }).catch(() => {});
    });
  }, []);

  const displayTestimonials = liveTestimonials.length
    ? liveTestimonials.map(t => ({ name: t.author_name, role: t.author_title ?? "", text: t.content, avatar: t.author_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(), rating: t.rating ?? 5 }))
    : TESTIMONIALS;

  const displayBlogs = liveBlogs.length
    ? liveBlogs.map(b => ({ title: b.title, tag: b.category_id ?? "Article", date: b.published_at ? new Date(b.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "", excerpt: b.excerpt ?? "", readTime: b.read_time_minutes ? `${b.read_time_minutes} min read` : "", cover: b.cover_image_url, _raw: b }))
    : INSIGHTS.map(i => ({ ...i, cover: null, _raw: i }));

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsStarted(true); }, { threshold: 0.2 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % displayTestimonials.length), 5000);
    return () => clearInterval(t);
  }, [displayTestimonials.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setProcessStarted(true); }, { threshold: 0.3 });
    if (processRef.current) observer.observe(processRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!processStarted) return;
    const total = WORKFLOW.length - 1;
    let current = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const runCycle = () => {
      current = 0; setDotStep(0); setBouncingStep(0);
      setTimeout(() => setBouncingStep(null), 500);
      const interval = setInterval(() => {
        current += 1; setDotStep(current); setBouncingStep(current);
        setTimeout(() => setBouncingStep(null), 500);
        if (current >= total) { clearInterval(interval); timeout = setTimeout(runCycle, 1200); }
      }, 900);
    };
    runCycle();
    return () => clearTimeout(timeout);
  }, [processStarted]);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "#102A43" }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "48px 48px" }} />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10" style={{ background: "radial-gradient(ellipse at top right, #087F5B, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-10" style={{ background: "radial-gradient(ellipse at bottom left, #C8A45D, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-[#E2E8F0] bg-white backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#087F5B" }} />
              <span className="text-xs font-semibold uppercase tracking-widest text-black" style={{ fontFamily: "Inter" }}>Chartered Accountants & Financial Advisors</span>
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
              <button onClick={() => navigate("book")} className="flex items-center gap-2 px-7 py-4 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Calendar size={18} /> Book Consultation
              </button>
              <button onClick={() => navigate("services")} className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/20 text-white hover:bg-white/10" style={{ fontFamily: "Inter" }}>
                Explore Services <ChevronRight size={18} />
              </button>
              <button onClick={() => navigate("login")} className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5" style={{ fontFamily: "Inter" }}>
                <UploadCloud size={16} /> Upload Documents
              </button>
              <button onClick={() => handleDownloadResource("Firm Profile")} className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5" style={{ fontFamily: "Inter" }}>
                <Download size={16} /> Download Firm Profile
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-white/10">
              {["ICAI Registered", "ISO 27001 Certified", "15+ Years Experience"].map(badge => (
                <div key={badge} className="flex items-center gap-2">
                  <CheckCircle size={16} style={{ color: "#087F5B" }} />
                  <span className="text-sm text-white/60 font-medium" style={{ fontFamily: "Inter" }}>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" /><div className="w-2 h-2 rounded-full bg-yellow-400" /><div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <span className="text-white/50 text-xs font-medium tracking-wide">portal.finovara.in</span>
                  <Lock size={14} className="text-white/30" />
                </div>
                <div className="p-6">
                  <div className="text-white/50 text-xs mb-4 uppercase tracking-widest">Dashboard Overview</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[{ label: "Compliance Score", value: "98%", color: "#087F5B", icon: Shield }, { label: "Pending Tasks", value: "3", color: "#C8A45D", icon: Bell }, { label: "Documents", value: "247", color: "white", icon: Folder }, { label: "Due This Month", value: "₹1.2L", color: "#2F9E44", icon: Calendar }].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} className="rounded-2xl p-4 bg-white/5 border border-white/5">
                        <Icon size={16} style={{ color }} className="mb-2" />
                        <div className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Manrope" }}>{value}</div>
                        <div className="text-xs text-white/40">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl p-4 bg-white/5 border border-white/5">
                    <div className="text-xs text-white/40 mb-3 uppercase tracking-wider">Recent Activity</div>
                    {["ITR Filed — FY 2024-25", "GST Return Submitted", "TDS Certificate Uploaded"].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <CheckCircle size={14} style={{ color: "#087F5B" }} />
                        <span className="text-xs text-white/60">{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EAF4F0" }}><Shield size={16} style={{ color: "#087F5B" }} /></div>
                <div>
                  <div className="text-xs font-semibold text-white" style={{ fontFamily: "Manrope" }}>256-bit Encrypted</div>
                  <div className="text-xs text-[#94A3B8]">Bank-grade security</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
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
              {STATS.map((s) => <StatCard key={s.label} value={s.value} suffix={s.suffix} label={s.label} started={statsStarted} />)}
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
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight" style={{ fontFamily: "Manrope" }}>The Standard for Modern <span style={{ color: "#087F5B" }}>Financial Advisory</span></h2>
              <p className="text-gray-600 text-lg leading-relaxed" style={{ fontFamily: "Inter" }}>We combine deep domain expertise with secure digital infrastructure to deliver compliance and advisory services that keep your business ahead.</p>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} onMouseEnter={() => setActiveService(i)} onClick={() => { window.sessionStorage.setItem("activeService", i.toString()); window.dispatchEvent(new Event("serviceChanged")); navigate("services"); }}
                className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-300 ${activeService === i ? "border-[#087F5B] shadow-xl scale-105" : "border-gray-200 hover:border-[#087F5B]"}`}
                style={{ background: activeService === i ? "linear-gradient(135deg, #102A43, #0d3355)" : "white" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: activeService === i ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                  <Icon size={20} style={{ color: activeService === i ? "#C8A45D" : "#087F5B" }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ fontFamily: "Manrope", color: activeService === i ? "white" : "#102A43" }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ fontFamily: "Inter", color: activeService === i ? "rgba(255,255,255,0.6)" : "#52606D" }}>{desc}</p>
                {activeService === i && <button className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: "#C8A45D" }}>Learn More <ArrowRight size={12} /></button>}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate("services")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm hover:bg-[#087F5B] hover:text-white transition-all" style={{ fontFamily: "Inter" }}>
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
            </div>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {INDUSTRIES.map(({ icon: Icon, label }) => (
                <button key={label} onClick={() => { window.sessionStorage.setItem("activeIndustry", label); window.dispatchEvent(new Event("industryChanged")); navigate("industries"); }}
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

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Client Stories</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Manrope" }}>Trusted by Industry Leaders</h2>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-200">
              <Quote size={40} style={{ color: "#087F5B" }} className="mb-6 opacity-30" />
              <p className="text-xl md:text-2xl text-gray-900 leading-relaxed mb-8 font-medium" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>
                "{displayTestimonials[activeTestimonial]?.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>{displayTestimonials[activeTestimonial]?.avatar}</div>
                <div>
                  <div className="font-bold text-gray-900" style={{ fontFamily: "Manrope" }}>{displayTestimonials[activeTestimonial]?.name}</div>
                  <div className="text-sm text-gray-600">{displayTestimonials[activeTestimonial]?.role}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  {Array.from({ length: displayTestimonials[activeTestimonial]?.rating ?? 5 }).map((_, i) => <Star key={i} size={16} fill="#C8A45D" style={{ color: "#C8A45D" }} />)}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              {displayTestimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)} className="rounded-full transition-all" style={{ width: i === activeTestimonial ? 24 : 8, height: 8, background: i === activeTestimonial ? "#087F5B" : "#E2E8F0" }} />
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate("testimonials")} className="text-sm font-semibold text-[#087F5B] hover:underline">Read All Testimonials →</button>
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
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50">
                  <span className="font-semibold text-gray-900 pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
                </button>
                {openFaq === i && <div className="px-6 pb-5"><p className="text-gray-600 leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p></div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate("faqs")} className="text-sm font-semibold text-[#087F5B] hover:underline">View All FAQs →</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #087F5B 0%, #065a40 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
            Ready to Transform Your<br />
            <span style={{ fontFamily: "Playfair Display", fontStyle: "italic", color: "#C8A45D" }}>Financial Strategy?</span>
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>Schedule a no-obligation consultation with our senior advisors.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => navigate("book")} className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 font-semibold text-white text-base hover:shadow-xl transition-all hover:-translate-y-0.5" style={{ fontFamily: "Inter" }}>
              <Calendar size={18} /> Book Free Consultation
            </button>
            <button onClick={() => navigate("contact")} className="flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all" style={{ fontFamily: "Inter" }}>
              <Phone size={18} /> Call Us Now
            </button>
          </div>
        </div>
      </section>

      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}
