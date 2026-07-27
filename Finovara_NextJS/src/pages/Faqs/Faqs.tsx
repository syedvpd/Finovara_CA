"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FAQS } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { useNavigate } from "@/hooks/useNavigate";

const EXTRA_FAQS = [
  { q: "How do I upload documents to the portal?", a: "Log in to your client portal, navigate to the Documents section, and use the secure upload interface. All files are encrypted in transit and at rest." },
  { q: "Can I track the status of my compliance filings?", a: "Yes. Your dashboard shows real-time status for every active engagement — from document collection through to final delivery." },
  { q: "Do you handle multi-state GST registrations?", a: "Absolutely. We manage GST registrations and returns across all states, including reconciliation and input tax credit reviews." },
  { q: "What is your data retention policy?", a: "Client documents are retained for 8 years in line with statutory requirements. You can request deletion of non-statutory data at any time." },
];

const ALL_FAQS = [...FAQS, ...EXTRA_FAQS];

export function FaqsPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Help Centre</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Frequently Asked Questions</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Everything you need to know about working with Finovara.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-3">
            {ALL_FAQS.map((faq, i) => (
              <Reveal key={i} direction="up">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button onClick={() => setOpen(open === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-gray-900 pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                    {open === i
                      ? <ChevronUp size={20} style={{ color: "#087F5B" }} />
                      : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
                  </button>
                  {open === i && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Manrope" }}>Still have questions?</h3>
            <p className="text-gray-600 text-sm mb-6" style={{ fontFamily: "Inter" }}>Our team is happy to help. Reach out and we'll respond within 24 hours.</p>
            <button onClick={() => navigate("contact")}
              className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
