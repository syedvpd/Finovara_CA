"use client";
import { useState } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { INDUSTRIES, INDUSTRY_DETAILS } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { useNavigate } from "@/hooks/useNavigate";

export function IndustriesPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  const detail = active ? INDUSTRY_DETAILS[active] : null;

  return (
    <div>
      {/* Hero */}
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Sectors We Serve</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Industries</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Deep domain expertise across 16+ industry verticals with dedicated specialist teams.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => setActive(active === label ? null : label)}
                className={`group flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${active === label ? "border-[#087F5B] shadow-lg" : "border-gray-200 hover:border-[#087F5B] hover:-translate-y-1"}`}
                style={{ background: active === label ? "linear-gradient(135deg, #102A43, #0d3355)" : "white" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: active === label ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                  <Icon size={22} style={{ color: active === label ? "#C8A45D" : "#087F5B" }} />
                </div>
                <span className="text-xs font-semibold text-center" style={{ fontFamily: "Manrope", color: active === label ? "white" : "#102A43" }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {active && detail && (
            <Reveal direction="up" key={active}>
              <div className="mt-10 bg-gray-50 rounded-3xl p-8 border border-gray-200">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-6" style={{ fontFamily: "Manrope" }}>{active}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Services We Offer</h3>
                    <div className="space-y-2">
                      {detail.services.map((s) => (
                        <div key={s} className="flex items-center gap-2">
                          <CheckCircle size={15} style={{ color: "#087F5B" }} />
                          <span className="text-sm text-gray-700" style={{ fontFamily: "Inter" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Key Compliance Areas</h3>
                    <div className="space-y-2">
                      {detail.compliance.map((c) => (
                        <div key={c} className="flex items-center gap-2">
                          <CheckCircle size={15} style={{ color: "#C8A45D" }} />
                          <span className="text-sm text-gray-700" style={{ fontFamily: "Inter" }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate("book")}
                  className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                  Get Sector-Specific Advice <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Don't See Your Industry?</h2>
          <p className="text-white/70 mb-8" style={{ fontFamily: "Inter" }}>We work with businesses across all sectors. Contact us to discuss your specific needs.</p>
          <button onClick={() => navigate("contact")}
            className="px-8 py-4 rounded-xl bg-white font-bold text-sm hover:opacity-90 transition-all"
            style={{ color: "#087F5B", fontFamily: "Inter" }}>
            Contact Us
          </button>
        </div>
      </section>
    </div>
  );
}
