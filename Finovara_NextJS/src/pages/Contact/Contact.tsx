"use client";
import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await publicApi.submitContact(form);
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  const INFO = [
    { icon: Phone, label: "Phone", value: "+91 40 1234 5678", sub: "Mon–Sat, 9 AM – 7 PM" },
    { icon: Mail, label: "Email", value: "hello@finovara.in", sub: "We reply within 24 hours" },
    { icon: MapPin, label: "Office", value: "Hyderabad, Telangana", sub: "India" },
    { icon: Clock, label: "Hours", value: "Mon–Sat: 9 AM – 7 PM", sub: "Sun: Closed" },
  ];

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Get In Touch</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Contact Us</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Have a question or ready to get started? We'd love to hear from you.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Info */}
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-6" style={{ fontFamily: "Manrope" }}>Reach Out to Us</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {INFO.map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="flex gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EAF4F0" }}>
                      <Icon size={18} style={{ color: "#087F5B" }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5" style={{ fontFamily: "Inter" }}>{label}</div>
                      <div className="font-semibold text-gray-900 text-sm" style={{ fontFamily: "Manrope" }}>{value}</div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: "Inter" }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6" style={{ fontFamily: "Manrope" }}>Send a Message</h2>

                {status === "success" ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#EAF4F0" }}>
                      <Send size={24} style={{ color: "#087F5B" }} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Manrope" }}>Message Sent!</h3>
                    <p className="text-gray-600 text-sm" style={{ fontFamily: "Inter" }}>We'll get back to you within 24 hours.</p>
                    <button onClick={() => setStatus("idle")} className="mt-4 text-sm font-semibold" style={{ color: "#087F5B", fontFamily: "Inter" }}>Send another message</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { key: "name", label: "Full Name", type: "text" },
                        { key: "email", label: "Email Address", type: "email" },
                        { key: "phone", label: "Phone Number", type: "tel" },
                        { key: "subject", label: "Subject", type: "text" },
                      ].map(({ key, label, type }) => (
                        <input key={key} type={type} placeholder={label} required={key !== "phone"}
                          value={(form as any)[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white"
                          style={{ fontFamily: "Inter" }} />
                      ))}
                    </div>
                    <textarea placeholder="Your Message" rows={4} required
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#087F5B] bg-white resize-none"
                      style={{ fontFamily: "Inter" }} />
                    {status === "error" && (
                      <p className="text-xs text-red-600" style={{ fontFamily: "Inter" }}>Failed to send. Please try again.</p>
                    )}
                    <button type="submit" disabled={status === "loading"}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                      <Send size={16} />
                      {status === "loading" ? "Sending…" : "Send Message"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
