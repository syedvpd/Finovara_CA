import { useState, useRef, ChangeEvent, FocusEvent, FormEvent } from "react";
import { publicApi } from "../../services/public";
import { ApiError } from "../../lib/api";
import {
  Phone, Mail, MapPin, CheckCircle, Calendar, MessageCircle, AlertCircle, Send, Check, Loader2, ChevronDown
} from "lucide-react";
import { Page } from "../../types/index";
import { SERVICES } from "../../utils/constants";

// --- Validation Constants ---
const DISPOSABLE_EMAILS = ['tempmail.com', '10minutemail.com', 'yopmail.com', 'guerrillamail.com', 'mailinator.com'];
const SPAM_PATTERN = /(.)\1{4,}/; // more than 4 repeated characters

type FieldName = 'name' | 'email' | 'phone' | 'service' | 'message' | 'honeypot';

interface FormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  honeypot: string; // Anti-bot
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
}

interface FormTouched {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  service?: boolean;
  message?: boolean;
}

export function ContactPage({ setPage }: { setPage: (p: Page) => void }) {
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', service: '', message: '', honeypot: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState('');

  // Refs for auto-scrolling to errors
  const inputRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    service: useRef<HTMLSelectElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };

  // --- Validation Logic ---
  const validateField = (name: FieldName, value: string): string => {
    const trimmed = value.trim();
    switch (name) {
      case 'name':
        if (!trimmed) return "Full name is required";
        if (trimmed.length < 3) return "Name must be at least 3 characters";
        if (trimmed.length > 60) return "Name cannot exceed 60 characters";
        if (!/^[A-Za-z\s]+$/.test(trimmed)) return "Enter a valid name (letters only)";
        return "";
      case 'email':
        if (!trimmed) return "Email is required";
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) return "Enter a valid email address";
        const domain = trimmed.split('@')[1]?.toLowerCase();
        if (domain && DISPOSABLE_EMAILS.includes(domain)) return "Please use a valid business email address";
        return "";
      case 'phone':
        if (!trimmed) return "Phone number is required";
        const phoneClean = trimmed.replace(/[\s\-]/g, '');
        if (!/^(\+91)?[6789]\d{9}$/.test(phoneClean)) return "Enter a valid 10-digit Indian mobile number (e.g. 9876543210)";
        return "";
      case 'service':
        if (!trimmed) return "Please select a service";
        return "";
      case 'message':
        if (!trimmed) return "Message is required";
        if (trimmed.length < 20) return "Please describe your requirement (min 20 characters)";
        if (trimmed.length > 500) return "Message cannot exceed 500 characters";
        if (SPAM_PATTERN.test(trimmed)) return "Spam detected: excessive repeated characters";
        if (/(<script|<\/script>|javascript:|onerror=)/i.test(trimmed)) return "Invalid characters detected";
        return "";
      default:
        return "";
    }
  };

  const validateAll = (): FormErrors => {
    const newErrors: FormErrors = {};
    (['name', 'email', 'phone', 'service', 'message'] as FieldName[]).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field as keyof FormErrors] = error;
    });
    return newErrors;
  };

  // --- Handlers ---
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-formatting for phone (allow +91 prefix and numbers)
    let formattedValue = value;
    if (name === 'phone') {
      formattedValue = value.replace(/[^\d\s\+\-]/g, '');
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    // Clear error as user types (only if already touched)
    if (touched[name as keyof FormTouched]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name as FieldName, formattedValue) }));
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Trim values on blur, convert email to lowercase
    if (name === 'email') finalValue = value.trim().toLowerCase();
    else finalValue = value.trim();

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name as FieldName, finalValue) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Honeypot check
    if (formData.honeypot) {
      console.warn("Bot detected.");
      return;
    }

    // Touch all fields
    setTouched({ name: true, email: true, phone: true, service: true, message: true });

    // Validate
    const newErrors = validateAll();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0] as keyof typeof inputRefs;
      inputRefs[firstErrorField]?.current?.focus();
      inputRefs[firstErrorField]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // All clear - Submit
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrors({});

    try {
      const res = await publicApi.submitContact({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        message: formData.message.trim(),
        phone: formData.phone.replace(/[\s-]/g, "") || undefined,
        subject: formData.service || undefined,
        website: formData.honeypot || undefined,
      });

      setSubmitStatus('success');
      setToastMessage(res?.message ?? "Your request has been submitted successfully. Our team will contact you shortly.");
      setFormData({ name: '', email: '', phone: '', service: '', message: '', honeypot: '' });
      setTouched({});

      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (err) {
      setSubmitStatus('error');
      setToastMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI Helpers ---
  const isFieldValid = (field: keyof FormTouched) => touched[field] && !errors[field];
  
  const getInputStyles = (field: keyof FormTouched) => {
    const base = "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-300 font-medium placeholder-[#94A3B8] ";
    if (errors[field]) return base + "border-red-500 bg-red-50 text-[#102A43] focus:ring-4 focus:ring-red-500/20 focus:border-red-500";
    if (isFieldValid(field)) return base + "border-green-500 bg-[#102A43] text-white focus:ring-4 focus:ring-[#087F5B]/20 focus:border-[#087F5B]";
    return base + "border-[#CBD5E1] bg-[#102A43] text-white focus:ring-4 focus:ring-[#087F5B]/20 focus:border-[#087F5B] hover:border-[#94A3B8]";
  };

  const isFormValid = Object.keys(validateAll()).length === 0;

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Get in Touch</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Contact Finovara</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>We're here to help. Reach out through any channel most convenient for you.</p>
        </div>
      </section>

      <section className="py-20 relative" style={{ background: "#ffffff" }}>
        
        {/* Toast Notification */}
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${submitStatus === 'success' ? 'opacity-100 translate-y-0 bg-[#C8A45D] text-[#102A43]' : submitStatus === 'error' ? 'opacity-100 translate-y-0 bg-red-600 text-white' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
          {submitStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium" style={{ fontFamily: "Inter" }}>{toastMessage}</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-12">
          {/* Contact Info Sidebar */}
          <div className="space-y-4">
            {[
              { icon: Phone, label: "Call Us", value: "+91 22 6789 0123", sub: "Mon–Sat, 9:00 AM – 7:00 PM", href: "tel:+912267890123" },
              { icon: Mail, label: "Email Us", value: "hello@finovara.in", sub: "Response within 2 business hours", href: "mailto:hello@finovara.in" },
              { icon: MessageCircle, label: "WhatsApp", value: "+91 98765 43210", sub: "Quick queries, Mon–Sat", href: "https://wa.me/919876543210" },
              { icon: MapPin, label: "Headquarters", value: "Hyderabad, Telangana", sub: "India", href: "https://maps.google.com/?q=Finovara+Hyderabad+Telangana" },
            ].map(({ icon: Icon, label, value, sub, href }) => (
              <a key={label} href={href} target={href.startsWith('http') ? "_blank" : undefined} rel={href.startsWith('http') ? "noopener noreferrer" : undefined} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] flex items-start gap-4 hover:shadow-xl hover:border-[#087F5B]/30 transition-all duration-300 group block">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#102A43] group-hover:bg-[#EAF4F0] transition-colors">
                  <Icon size={20} className="text-[#94A3B8] group-hover:text-[#087F5B] transition-colors" />
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] mb-1 font-semibold uppercase tracking-wider" style={{ fontFamily: "Inter" }}>{label}</div>
                  <div className="font-extrabold text-black text-lg group-hover:text-[#087F5B] transition-colors" style={{ fontFamily: "Manrope" }}>{value}</div>
                  {sub && <div className="text-sm text-[#94A3B8] mt-1" style={{ fontFamily: "Inter" }}>{sub}</div>}
                </div>
              </a>
            ))}
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-black mb-5 uppercase tracking-widest font-bold" style={{ fontFamily: "Inter" }}>Business Hours</div>
              {[
                { day: "Monday – Friday", hrs: "9:00 AM – 7:00 PM" },
                { day: "Saturday", hrs: "10:00 AM – 3:00 PM" },
                { day: "Sunday", hrs: "Closed" },
              ].map(({ day, hrs }) => (
                <div key={day} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0 last:pb-0">
                  <span className="text-sm font-bold text-black" style={{ fontFamily: "Inter" }}>{day}</span>
                  <span className="text-sm font-semibold text-black" style={{ fontFamily: "Inter" }}>{hrs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 md:p-12 border border-[#E2E8F0] shadow-xl shadow-[#102A43]/5 relative overflow-hidden">
            <h2 className="text-3xl font-extrabold text-[#102A43] mb-8" style={{ fontFamily: "Manrope" }}>Send Us a Message</h2>
            
            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot */}
              <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div className="grid md:grid-cols-2 gap-x-6 gap-y-8 mb-8">
                {/* Full Name */}
                <div className="relative">
                  <label htmlFor="name" className="text-xs font-bold text-black mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                    Full Name <span className="text-red-500 text-base leading-none">*</span>
                  </label>
                  <div className="relative">
                    <input ref={inputRefs.name} id="name" name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} placeholder="Rahul Sharma" className={getInputStyles('name')} aria-invalid={!!errors.name} aria-describedby="name-error" />
                    {isFieldValid('name') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                  </div>
                  {errors.name && <p id="name-error" className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all"><AlertCircle size={14} /> {errors.name}</p>}
                </div>

                {/* Email Address */}
                <div className="relative">
                  <label htmlFor="email" className="text-xs font-bold text-black mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                    Email Address <span className="text-red-500 text-base leading-none">*</span>
                  </label>
                  <div className="relative">
                    <input ref={inputRefs.email} id="email" type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="rahul@company.com" className={getInputStyles('email')} aria-invalid={!!errors.email} aria-describedby="email-error" />
                    {isFieldValid('email') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                  </div>
                  {errors.email && <p id="email-error" className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all"><AlertCircle size={14} /> {errors.email}</p>}
                </div>

                {/* Phone Number */}
                <div className="relative">
                  <label htmlFor="phone" className="text-xs font-bold text-black mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                    Phone Number <span className="text-red-500 text-base leading-none">*</span>
                  </label>
                  <div className="relative">
                    <input ref={inputRefs.phone} id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} placeholder="+91 98765 43210" className={getInputStyles('phone')} aria-invalid={!!errors.phone} aria-describedby="phone-error" />
                    {isFieldValid('phone') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                  </div>
                  {errors.phone && <p id="phone-error" className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all"><AlertCircle size={14} /> {errors.phone}</p>}
                </div>

                {/* Service Required */}
                <div className="relative">
                  <label htmlFor="service" className="text-xs font-bold text-black mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                    Service Required <span className="text-red-500 text-base leading-none">*</span>
                  </label>
                  <div className="relative">
                    <select ref={inputRefs.service} id="service" name="service" value={formData.service} onChange={handleChange} onBlur={handleBlur} className={`${getInputStyles('service')} appearance-none cursor-pointer`} aria-invalid={!!errors.service} aria-describedby="service-error">
                      <option value="" disabled style={{ background: '#fff', color: '#102A43' }}>Select a service</option>
                      {SERVICES.map(s => <option key={s.title} value={s.title} style={{ background: '#fff', color: '#102A43' }}>{s.title}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  </div>
                  {errors.service && <p id="service-error" className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all"><AlertCircle size={14} /> {errors.service}</p>}
                </div>
              </div>

              {/* Message */}
              <div className="mb-10 relative">
                <label htmlFor="message" className="text-xs font-bold text-black mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                  Message <span className="text-red-500 text-base leading-none">*</span>
                </label>
                <div className="relative">
                  <textarea ref={inputRefs.message} id="message" name="message" value={formData.message} onChange={handleChange} onBlur={handleBlur} rows={5} placeholder="Please describe your requirements..." className={`${getInputStyles('message')} resize-none`} aria-invalid={!!errors.message} aria-describedby="message-error" />
                  {isFieldValid('message') && <Check size={18} className="absolute right-4 top-4 text-green-500" />}
                </div>
                {errors.message && <p id="message-error" className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all"><AlertCircle size={14} /> {errors.message}</p>}
                <div className={`text-xs text-right mt-2 font-semibold ${formData.message.length > 500 ? 'text-red-500' : 'text-[#94A3B8]'}`} style={{ fontFamily: "Inter" }}>
                  {formData.message.length} / 500
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-white/10">
                <button type="submit" disabled={isSubmitting} className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-extrabold text-base transition-all duration-300 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-[#087F5B]/30'}`} style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                  {isSubmitting ? (
                    <><Loader2 size={20} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><Send size={20} /> Send Message</>
                  )}
                </button>
                <button type="button" onClick={() => setPage("book")} className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-extrabold text-base hover:bg-[#087F5B] hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#087F5B]/20" style={{ fontFamily: "Inter" }}>
                  <Calendar size={20} /> Book Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Map Action Banner */}
      <div className="border-t border-white/10 bg-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#102A43] rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
              <MapPin size={24} style={{ color: "#087F5B" }} />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white mb-1" style={{ fontFamily: "Manrope" }}>Finovara Headquarters</h3>
              <p className="text-[#94A3B8] font-medium text-sm" style={{ fontFamily: "Inter" }}>Hyderabad, Telangana, India</p>
            </div>
          </div>
          <a href="https://maps.google.com/?q=Finovara+Hyderabad+Telangana" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-[#102A43] text-white rounded-xl font-bold text-sm hover:bg-[#087F5B] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg shadow-[#087F5B]/20 whitespace-nowrap">
            <MapPin size={18} /> Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}