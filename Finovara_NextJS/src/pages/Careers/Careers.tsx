"use client";
import { useState, useEffect } from "react";
import { MapPin, Briefcase, Clock, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { OPEN_POSITIONS } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";
import type { Career } from "@/services/public";

export function CareersPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [form, setForm] = useState({ applicant_name: "", applicant_email: "", applicant_phone: "", cover_letter: "", resume: null as File | null });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    publicApi.careers()
      .then(d => { if (d.length) setPositions(d.filter((c: Career) => c.is_open)); })
      .catch(() => {});
  }, []);

  const display = positions.length
    ? positions.map(c => ({ id: c.id, title: c.title, dept: c.department ?? "", type: c.employment_type ?? "Full-time", location: c.location ?? "", description: c.description ?? "" }))
    : OPEN_POSITIONS.map((p, i) => ({ id: String(i), ...p, description: "" }));

  async function handleApply(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!form.resume) return;
    setStatus("loading");
    try {
      await publicApi.applyForVacancy(id, { ...form, resume: form.resume });
      setStatus("success");
      setApplying(null);
      setForm({ applicant_name: "", applicant_email: "", applicant_phone: "", cover_letter: "", resume: null });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Join Our Team</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Careers at Finovara</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Build your career with one of India's leading chartered accountancy firms.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {status === "success" && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium" style={{ fontFamily: "Inter" }}>
              Application submitted successfully! We'll be in touch within 5 business days.
            </div>
          )}

          <div className="space-y-4">
            {display.map((pos) => (
              <Reveal key={pos.id} direction="up">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#087F5B] transition-all">
                  <button onClick={() => setExpanded(expanded === pos.id ? null : pos.id)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-gray-900" style={{ fontFamily: "Manrope" }}>{pos.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500" style={{ fontFamily: "Inter" }}><Briefcase size={12} />{pos.dept}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500" style={{ fontFamily: "Inter" }}><MapPin size={12} />{pos.location}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500" style={{ fontFamily: "Inter" }}><Clock size={12} />{pos.type}</span>
                      </div>
                    </div>
                    {expanded === pos.id ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
                  </button>

                  {expanded === pos.id && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      {pos.description && <p className="text-sm text-gray-600 mt-4 mb-4" style={{ fontFamily: "Inter" }}>{pos.description}</p>}

                      {applying === pos.id ? (
                        <form onSubmit={e => handleApply(e, pos.id)} className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { key: "applicant_name", label: "Full Name", type: "text" },
                              { key: "applicant_email", label: "Email", type: "email" },
                              { key: "applicant_phone", label: "Phone", type: "tel" },
                            ].map(({ key, label, type }) => (
                              <input key={key} type={type} placeholder={label} required
                                value={(form as any)[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B]"
                                style={{ fontFamily: "Inter" }} />
                            ))}
                          </div>
                          <textarea placeholder="Cover Letter (optional)" rows={3}
                            value={form.cover_letter}
                            onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] resize-none"
                            style={{ fontFamily: "Inter" }} />
                          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:border-[#087F5B] transition-colors">
                            <Upload size={16} style={{ color: "#087F5B" }} />
                            <span className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>
                              {form.resume ? form.resume.name : "Upload Resume (PDF/DOC)"}
                            </span>
                            <input type="file" accept=".pdf,.doc,.docx" className="hidden" required
                              onChange={e => setForm(f => ({ ...f, resume: e.target.files?.[0] ?? null }))} />
                          </label>
                          <div className="flex gap-3">
                            <button type="submit" disabled={status === "loading"}
                              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
                              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                              {status === "loading" ? "Submitting…" : "Submit Application"}
                            </button>
                            <button type="button" onClick={() => setApplying(null)}
                              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                              style={{ fontFamily: "Inter" }}>
                              Cancel
                            </button>
                          </div>
                          {status === "error" && <p className="text-xs text-red-600" style={{ fontFamily: "Inter" }}>Submission failed. Please try again.</p>}
                        </form>
                      ) : (
                        <button onClick={() => { setApplying(pos.id); setStatus("idle"); }}
                          className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                          style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                          Apply Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
