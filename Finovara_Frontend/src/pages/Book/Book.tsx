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
import { SERVICES } from "../../utils/constants";
import { publicApi } from "../../services/public";
import { ApiError } from "../../lib/api";

export function BookPage() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateBookingField = (name: string, value: string): string => {
    const trimmed = value.trim();
    if (name === 'name') {
      if (!trimmed) return "Full name is required";
      if (trimmed.length < 3) return "Name must be at least 3 characters";
      if (!/^[A-Za-z\s]+$/.test(trimmed)) return "Enter a valid name (letters only)";
      return "";
    }
    if (name === 'email') {
      if (!trimmed) return "Email address is required";
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) return "Enter a valid email address";
      return "";
    }
    if (name === 'phone') {
      if (!trimmed) return "Phone number is required";
      const digits = trimmed.replace(/[\s\-]/g, '');
      if (!/^(\+91)?[6789]\d{9}$/.test(digits)) return "Enter a valid 10-digit Indian mobile number";
      return "";
    }
    return "";
  };

  const handleConfirm = async () => {
    const newErrors: Record<string, string> = {};
    ['name', 'email', 'phone'].forEach(field => {
      const err = validateBookingField(field, formData[field as keyof typeof formData]);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    // No public "consultation" endpoint exists; the booking is captured as a
    // contact enquiry with the slot details folded into the message.
    const message = [
      `Consultation request for: ${selectedService || "General"}`,
      `Preferred slot: ${selectedDate || "—"} at ${selectedTime || "—"}`,
      formData.company ? `Company: ${formData.company}` : "",
      formData.notes ? `Notes: ${formData.notes}` : "",
    ].filter(Boolean).join("\n");

    try {
      await publicApi.submitContact({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        message,
        phone: formData.phone.replace(/[\s-]/g, "") || undefined,
        subject: `Consultation — ${selectedService || "General"}`,
      });
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not submit your booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const times = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#ffffff" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
            <Calendar size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-[#102A43] mb-2" style={{ fontFamily: "Manrope" }}>Book a Consultation</h1>
          <p className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Free 30-minute session with a senior Finovara advisor</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: s <= step ? "#087F5B" : "#E2E8F0" }} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-xl font-bold text-[#102A43] mb-6" style={{ fontFamily: "Manrope" }}>What can we help you with?</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SERVICES.map(({ icon: Icon, title }) => (
                <button key={title} onClick={() => setSelectedService(title)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all text-sm font-medium ${selectedService === title ? "border-[#087F5B] bg-[#EAF4F0]" : "border-white/10 hover:border-[#087F5B]/30 bg-[#102A43]"}`}
                  style={{ fontFamily: "Inter", color: selectedService === title ? "#087F5B" : "white" }}>
                  <Icon size={16} style={{ color: selectedService === title ? "#087F5B" : "white", flexShrink: 0 }} />
                  {title}
                </button>
              ))}
            </div>
            <button disabled={!selectedService} onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-xl font-bold text-[#102A43] mb-6" style={{ fontFamily: "Manrope" }}>Choose Date & Time</h2>
            <div className="mb-6">
              <label className="text-xs font-semibold text-[#94A3B8] mb-2 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Preferred Date</label>
              <input type="date" value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const val = e.target.value;
                  if (val && val < new Date().toISOString().split('T')[0]) return;
                  setSelectedDate(val);
                }}
                onKeyDown={e => e.preventDefault()}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                style={{ fontFamily: "Inter", color: "white", colorScheme: "dark" }} />
            </div>
            <div className="mb-8">
              <label className="text-xs font-semibold text-[#94A3B8] mb-2 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Available Slots</label>
              <div className="grid grid-cols-4 gap-2">
                {times.map(time => (
                  <button key={time} onClick={() => setSelectedTime(time)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${selectedTime === time ? "border-[#087F5B] bg-[#EAF4F0] text-[#087F5B]" : "border-white/10 text-[#94A3B8] hover:border-[#087F5B]/30 bg-[#102A43]"}`}
                    style={{ fontFamily: "Inter" }}>
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border-2 border-white/10 text-[#94A3B8] font-semibold text-sm" style={{ fontFamily: "Inter" }}>← Back</button>
              <button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-xl font-bold text-[#102A43] mb-6" style={{ fontFamily: "Manrope" }}>Your Details</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-[#102A43] mb-1.5 flex items-center gap-1 uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Full Name <span className="text-red-500 text-base leading-none">*</span></label>
                <div className="relative">
                  <input value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} placeholder="e.g. Rahul Sharma" className={`w-full px-4 py-3 rounded-xl border transition-all ${errors.name ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500/20' : 'border-[#CBD5E1] bg-white text-[#102A43] placeholder-[#94A3B8] focus:ring-[#087F5B]/30 hover:border-[#087F5B]/40'} text-sm outline-none focus:ring-2`} style={{ fontFamily: "Inter" }} />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1.5 animate-in fade-in"><AlertCircle size={14} /> {errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#102A43] mb-1.5 flex items-center gap-1 uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Email Address <span className="text-red-500 text-base leading-none">*</span></label>
                <div className="relative">
                  <input type="email" value={formData.email} onChange={e => { const v = e.target.value; setFormData({...formData, email: v}); if (errors.email) setErrors({...errors, email: validateBookingField('email', v)}); }} onBlur={e => setErrors({...errors, email: validateBookingField('email', e.target.value)})} placeholder="e.g. rahul@company.com" className={`w-full px-4 py-3 rounded-xl border transition-all ${errors.email ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500/20' : 'border-[#CBD5E1] bg-white text-[#102A43] placeholder-[#94A3B8] focus:ring-[#087F5B]/30 hover:border-[#087F5B]/40'} text-sm outline-none focus:ring-2`} style={{ fontFamily: "Inter" }} />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1.5 animate-in fade-in"><AlertCircle size={14} /> {errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#102A43] mb-1.5 flex items-center gap-1 uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Phone Number <span className="text-red-500 text-base leading-none">*</span></label>
                <div className="relative">
                  <input type="tel" value={formData.phone} onChange={e => { const v = e.target.value.replace(/[^\d\s\+\-]/g, ''); setFormData({...formData, phone: v}); if (errors.phone) setErrors({...errors, phone: validateBookingField('phone', v)}); }} onBlur={e => setErrors({...errors, phone: validateBookingField('phone', e.target.value)})} placeholder="e.g. +91 98765 43210" className={`w-full px-4 py-3 rounded-xl border transition-all ${errors.phone ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500/20' : 'border-[#CBD5E1] bg-white text-[#102A43] placeholder-[#94A3B8] focus:ring-[#087F5B]/30 hover:border-[#087F5B]/40'} text-sm outline-none focus:ring-2`} style={{ fontFamily: "Inter" }} />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1.5 animate-in fade-in"><AlertCircle size={14} /> {errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#102A43] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Company / Organisation</label>
                <input value={formData.company} onChange={e => { setFormData({...formData, company: e.target.value}); setErrors({...errors, company: ''}); }} placeholder="e.g. Sharma Enterprises Pvt Ltd" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white text-[#102A43] placeholder-[#94A3B8] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 hover:border-[#087F5B]/40 transition-all" style={{ fontFamily: "Inter" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#102A43] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Additional Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="e.g. I need help with GST filing and tax planning for FY 2025-26" className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white text-[#102A43] placeholder-[#94A3B8] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 resize-none hover:border-[#087F5B]/40 transition-all" style={{ fontFamily: "Inter" }} />
              </div>
            </div>
            {/* Summary */}
            <div className="rounded-2xl p-4 mb-6" style={{ background: "#EAF4F0" }}>
              <div className="text-xs font-semibold text-[#087F5B] mb-2 uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Booking Summary</div>
              {[
                { k: "Service", v: selectedService },
                { k: "Date", v: selectedDate || "—" },
                { k: "Time", v: selectedTime || "—" },
                { k: "Duration", v: "30 minutes (Free)" },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{k}</span>
                  <span className="font-semibold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{v}</span>
                </div>
              ))}
            </div>
            {submitError && (
              <p className="text-red-500 text-sm mb-4 font-bold flex items-center gap-1.5"><AlertCircle size={16} /> {submitError}</p>
            )}
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} disabled={isSubmitting} className="flex-1 py-4 rounded-xl border-2 border-white/10 text-[#94A3B8] font-semibold text-sm disabled:opacity-40" style={{ fontFamily: "Inter" }}>← Back</button>
              <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 py-4 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                {isSubmitting ? "Submitting..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div className="bg-white rounded-3xl p-10 border border-[#E2E8F0] shadow-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#EAF4F0" }}>
              <CheckCircle size={32} style={{ color: "#087F5B" }} />
            </div>
            <h2 className="text-2xl font-extrabold text-[#102A43] mb-3" style={{ fontFamily: "Manrope" }}>Consultation Booked!</h2>
            <p className="text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>
              A confirmation has been sent to your email. Your advisor will reach out 24 hours before the session.
            </p>
            <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: "#EAF4F0" }}>
              {[
                { k: "Service", v: selectedService },
                { k: "Date & Time", v: `${selectedDate} at ${selectedTime}` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{k}</span>
                  <span className="font-semibold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm" style={{ fontFamily: "Inter" }}>
              Book Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}