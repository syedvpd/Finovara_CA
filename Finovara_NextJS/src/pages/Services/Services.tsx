"use client";
import { useState } from "react";
import { ChevronRight, CheckCircle, ArrowRight } from "lucide-react";
import { SERVICES, WORKFLOW } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { useNavigate } from "@/hooks/useNavigate";

export function ServicesPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const svc = SERVICES[active];

  return (
    <div>
      {/* Hero */}
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>What We Do</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Our Services</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              End-to-end financial, tax, and compliance solutions for businesses of every size.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Service Tabs + Detail */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-72 shrink-0">
              <div className="space-y-1 sticky top-24">
                {SERVICES.map(({ icon: Icon, title }, i) => (
                  <button key={title} onClick={() => setActive(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-semibold ${active === i ? "text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    style={{ background: active === i ? "linear-gradient(135deg, #087F5B, #065a40)" : undefined, fontFamily: "Inter" }}>
                    <Icon size={18} style={{ color: active === i ? "#C8A45D" : "#087F5B" }} />
                    {title}
                    {active === i && <ChevronRight size={16} className="ml-auto text-white/60" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div className="flex-1">
              <Reveal direction="up" key={active}>
                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                      <svc.icon size={28} style={{ color: "#087F5B" }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>{svc.title}</h2>
                      <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: "Inter" }}>{svc.desc}</p>
                    </div>
                  </div>

                  {svc.features && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>What's Included</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {svc.features.map((f: string) => (
                          <div key={f} className="flex items-center gap-2">
                            <CheckCircle size={15} style={{ color: "#087F5B" }} />
                            <span className="text-sm text-gray-700" style={{ fontFamily: "Inter" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {svc.deliverables && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Deliverables</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {svc.deliverables.map((d: string) => (
                          <div key={d} className="flex items-center gap-2">
                            <CheckCircle size={15} style={{ color: "#087F5B" }} />
                            <span className="text-sm text-gray-700" style={{ fontFamily: "Inter" }}>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {svc.workflow && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Audit Workflow</h3>
                      <div className="space-y-3">
                        {svc.workflow.map((w: { step: string; desc: string }, i: number) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#087F5B" }}>{i + 1}</div>
                            <div>
                              <div className="font-semibold text-sm text-gray-900" style={{ fontFamily: "Manrope" }}>{w.step}</div>
                              <div className="text-xs text-gray-600" style={{ fontFamily: "Inter" }}>{w.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => navigate("book")}
                    className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    Book a Consultation <ArrowRight size={16} />
                  </button>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>How It Works</p>
              <h2 className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope" }}>Our Engagement Process</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW.map(({ step, title, desc }) => (
              <Reveal key={step} direction="up">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#087F5B] transition-all">
                  <div className="text-3xl font-extrabold mb-3" style={{ color: "#087F5B", fontFamily: "Manrope" }}>{step}</div>
                  <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Manrope" }}>{title}</h3>
                  <p className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Ready to Get Started?</h2>
          <p className="text-white/70 mb-8" style={{ fontFamily: "Inter" }}>Schedule a free consultation with our senior advisors today.</p>
          <button onClick={() => navigate("book")}
            className="px-8 py-4 rounded-xl bg-white font-bold text-sm hover:opacity-90 transition-all"
            style={{ color: "#087F5B", fontFamily: "Inter" }}>
            Book Free Consultation
          </button>
        </div>
      </section>
    </div>
  );
}
