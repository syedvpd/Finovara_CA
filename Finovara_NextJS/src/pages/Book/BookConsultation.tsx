"use client";
import { useState } from "react";
import { Calendar, Clock, User, Mail, Phone, Building2, CheckCircle } from "lucide-react";
import { SERVICES } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";

const TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

export function BookPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    service: "", date: "", time: "", message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await publicApi.submitContact({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: `Consultation Request — ${form.service || "General"} — ${form.date} ${form.time}`,
        message: `Company: ${form.company}\nService: ${form.service}\nPreferred Date: ${form.date}\nPreferred Time: ${form.time}\n\n${form.message}`,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center max-w-md w-full shadow-lg">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#EAF4F0" }}>
            <CheckCircle size={32} style={{ color: "#087F5B" }} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Consultation Booked!</h2>
          <p className="text-gray-600 mb-6" style={{ fontFamily: "Inter" }}>
            Thank you, {form.name}. We'll confirm your appointment within 2 business hours.
          </p>
          <button onClick={() => setStatus("idle")}
            className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Free Consultation</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Book a Consultation</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Schedule a no-obligation call with our senior advisors.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Full Name", icon: User, type: "text" },
                  { key: "email", label: "Email Address", icon: Mail, type: "email" },
                  { key: "phone", label: "Phone Number", icon: Phone, type: "tel" },
                  { key: "company", label: "Company / Business", icon: Building2, type: "text" },
                ].map(({ key, label, icon: Icon, type }) => (
                  <div key={key} className="relative">
                    <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={type} placeholder={label} required={key !== "company"}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white"
                      style={{ fontFamily: "Inter" }} />
                  </div>
                ))}
              </div>

              {/* Service */}
              <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white text-gray-700"
                style={{ fontFamily: "Inter" }}>
                <option value="">Select a Service (optional)</option>
                {SERVICES.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
              </select>

              {/* Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" required
                    min={new Date().toISOString().split("T")[0]}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white text-gray-700"
                    style={{ fontFamily: "Inter" }} />
                </div>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white text-gray-700"
                    style={{ fontFamily: "Inter" }}>
                    <option value="">Preferred Time</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Message */}
              <textarea placeholder="Brief description of your requirements (optional)" rows={3}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white resize-none"
                style={{ fontFamily: "Inter" }} />

              {status === "error" && (
                <p className="text-xs text-red-600" style={{ fontFamily: "Inter" }}>Submission failed. Please try again.</p>
              )}

              <button type="submit" disabled={status === "loading"}
                className="w-full py-4 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                {status === "loading" ? "Booking…" : "Book Free Consultation"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
