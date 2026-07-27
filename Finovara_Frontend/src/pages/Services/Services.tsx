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
import { SERVICES } from "../../utils/constants";

export function ServicesPage({ setPage }: { setPage: (p: Page) => void }) {
  const [selected, setSelected] = useState(() => {
    const saved = window.sessionStorage.getItem("activeService");
    if (saved) {
      window.sessionStorage.removeItem("activeService");
      return parseInt(saved, 10) || 0;
    }
    return 0;
  });
  const [activeStep, setActiveStep] = useState(0);
  const service = SERVICES[selected];

  useEffect(() => {
    const handleServiceChange = () => {
      const saved = window.sessionStorage.getItem("activeService");
      if (saved) {
        window.sessionStorage.removeItem("activeService");
        setSelected(parseInt(saved, 10) || 0);
      }
    };
    window.addEventListener("serviceChanged", handleServiceChange);
    return () => window.removeEventListener("serviceChanged", handleServiceChange);
  }, []);

  useEffect(() => {
    setActiveStep(0);
  }, [selected]);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Our Services</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Comprehensive Financial Services</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
            End-to-end financial and compliance solutions delivered by qualified professionals with deep sector expertise.
          </p>
        </div>
      </section>

      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Service List */}
            <div className="space-y-2">
              {SERVICES.map(({ icon: Icon, title }, i) => (
                <button key={title} onClick={() => setSelected(i)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all ${selected === i ? "shadow-lg" : "hover:bg-[#102A43]"}`}
                  style={{ background: selected === i ? "linear-gradient(135deg, #102A43, #0d3355)" : "transparent" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: selected === i ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                    <Icon size={18} style={{ color: selected === i ? "#C8A45D" : "#087F5B" }} />
                  </div>
                  <span className="font-semibold text-sm" style={{ fontFamily: "Manrope", color: selected === i ? "white" : "#102A43" }}>{title}</span>
                  {selected === i && <ChevronRight size={16} className="ml-auto text-white/50" />}
                </button>
              ))}
            </div>

            {/* Service Detail */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] h-full">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#EAF4F0" }}>
                  <service.icon size={26} style={{ color: "#087F5B" }} />
                </div>
                <h2 className="text-3xl font-extrabold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>{service.title}</h2>
                <p className="text-[#52606D] text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>{service.desc}</p>

                {"features" in service && service.features && (
                  <div className="mb-8">
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Features</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {service.features.map((f: string) => (
                          <div key={f} className="flex items-start gap-2 bg-white p-3 rounded-xl border border-[#E2E8F0]">
                          <CheckCircle size={16} style={{ color: "#087F5B" }} className="mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-semibold text-[#102A43]" style={{ fontFamily: "Inter" }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {"portalFeatures" in service && service.portalFeatures && (
                  <div className="mb-8">
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Portal Features</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {service.portalFeatures.map((pf: string) => (
                          <div key={pf} className="flex items-start gap-2 bg-white p-3 rounded-xl border border-[#E2E8F0]">
                          <CheckCircle size={16} style={{ color: "#C8A45D" }} className="mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-semibold text-[#102A43]" style={{ fontFamily: "Inter" }}>{pf}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Key Benefits</h4>
                    <div className="space-y-2">
                      {["Expert handling by qualified CAs", "100% regulatory compliance", "Transparent pricing & timelines", "Dedicated relationship manager"].map(b => (
                        <div key={b} className="flex items-start gap-2">
                          <CheckCircle size={16} style={{ color: "#087F5B" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Deliverables</h4>
                    <div className="space-y-2">
                      {(("deliverables" in service && service.deliverables) || ["Comprehensive compliance filings", "Detailed advisory reports", "Digital document delivery", "Ongoing compliance monitoring"]).map((d: string) => (
                        <div key={d} className="flex items-start gap-2">
                          <FileCheck size={16} style={{ color: "#C8A45D" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {"workflow" in service && service.workflow && (
                  <div className="mb-8 p-6 bg-white rounded-2xl border border-[#E2E8F0]">
                    <h4 className="font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>Audit Workflow</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {service.workflow.map((item: any, idx: number) => (
                        <div key={item.step} className="flex items-center gap-2">
                          <button onClick={() => setActiveStep(idx)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-sm hover:shadow-md group ${activeStep === idx ? "bg-[#EAF4F0] border-[#087F5B] scale-105" : "bg-[#102A43] border-white/10 hover:bg-[#EAF4F0] hover:border-[#087F5B]/30 hover:-translate-y-0.5"}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-transform group-hover:scale-110 ${activeStep === idx ? "shadow-md" : ""}`} style={{ background: "#087F5B" }}>
                              {idx + 1}
                            </span>
                            <span className={`text-xs font-semibold transition-colors ${activeStep === idx ? "text-[#087F5B]" : "text-white group-hover:text-[#087F5B]"}`} style={{ fontFamily: "Inter" }}>{item.step}</span>
                          </button>
                          {idx < service.workflow.length - 1 && (
                            <ArrowRight size={14} className="text-[#087F5B]/50" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-[#102A43] p-4 rounded-xl border border-white/10">
                       <h5 className="font-bold text-white text-sm mb-1" style={{ fontFamily: "Manrope" }}>Step {activeStep + 1}: {service.workflow[activeStep].step}</h5>
                       <p className="text-sm text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{service.workflow[activeStep].desc}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setPage("book")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                  Book a Consultation <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}