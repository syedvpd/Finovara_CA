import { useState, useRef, useEffect, ChangeEvent, FocusEvent, FormEvent } from "react";
import {
  ChevronDown, MapPin, Briefcase, FileText, CheckCircle, AlertCircle, Loader2, Send, X, Users, Globe, Award, TrendingUp, Check, Trash2, UploadCloud, ArrowRight
} from "lucide-react";
import { Page } from "../../types/index";
import { OPEN_POSITIONS } from "../../utils/constants";
import { Reveal } from "../../components/animations/Reveal";
import { publicApi, Career } from "../../services/public";
import { ApiError } from "../../lib/api";

// Normalized shape the list renders; id is null for the static fallback.
interface Position { id: string | null; title: string; dept: string; location: string; type: string; }

// --- Validation Constants ---
const DISPOSABLE_EMAILS = ['tempmail.com', '10minutemail.com', 'yopmail.com', 'guerrillamail.com', 'mailinator.com'];

type FieldName = 'name' | 'email' | 'phone' | 'experience' | 'honeypot';

interface FormData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  honeypot: string; // Anti-bot
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  experience?: string;
  resume?: string;
}

interface FormTouched {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  experience?: boolean;
  resume?: boolean;
}

function ApplicationForm({ positionTitle, careerId, onComplete }: { positionTitle: string, careerId: string | null, onComplete: (status: 'success' | 'error', message?: string) => void }) {
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', experience: '', honeypot: '' });
  const [file, setFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for auto-scrolling to errors
  const inputRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    experience: useRef<HTMLInputElement>(null),
    resume: useRef<HTMLInputElement>(null),
  };

  // --- Validation Logic ---
  const validateField = (name: string, value: string | File | null): string => {
    if (name === 'resume') {
      const f = value as File | null;
      if (!f) return "Resume is required";
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith('.pdf')) return "Only PDF files are allowed";
      if (f.size > 5 * 1024 * 1024) return "File size must be less than 5MB";
      return "";
    }

    const trimmed = (value as string).trim();
    switch (name) {
      case 'name':
        if (!trimmed) return "Full name is required";
        if (trimmed.length < 3) return "Name must be at least 3 characters";
        if (trimmed.length > 60) return "Name cannot exceed 60 characters";
        if (!/^[A-Za-z\s]+$/.test(trimmed)) return "Enter a valid name (letters only)";
        return "";
      case 'email':
        if (!trimmed) return "Email is required";
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) return "Enter a valid professional email address";
        const domain = trimmed.split('@')[1]?.toLowerCase();
        if (domain && DISPOSABLE_EMAILS.includes(domain)) return "Please use a valid professional email address";
        return "";
      case 'phone':
        if (!trimmed) return "Phone number is required";
        const phoneClean = trimmed.replace(/[\s-]/g, '');
        if (!/^(\+91)?[6789]\d{9}$/.test(phoneClean)) return "Enter a valid 10-digit mobile number";
        return "";
      case 'experience':
        if (!trimmed) return "Experience is required";
        const expNum = parseFloat(trimmed);
        if (isNaN(expNum) || expNum < 0 || expNum > 40) return "Enter valid years of experience (0–40)";
        return "";
      default:
        return "";
    }
  };

  const validateAll = (): FormErrors => {
    const newErrors: FormErrors = {};
    (['name', 'email', 'phone', 'experience'] as FieldName[]).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field as keyof FormErrors] = error;
    });
    const resumeError = validateField('resume', file);
    if (resumeError) newErrors.resume = resumeError;
    return newErrors;
  };

  // --- Handlers ---
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    if (name === 'phone') {
      formattedValue = value.replace(/[^\d\s\+\-]/g, '');
    } else if (name === 'experience') {
      formattedValue = value.replace(/[^\d.]/g, ''); // Allow only numbers and dots
      // Prevent multiple dots
      if ((formattedValue.match(/\./g) || []).length > 1) {
        formattedValue = formattedValue.substring(0, formattedValue.length - 1);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    if (touched[name as keyof FormTouched]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, formattedValue) }));
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    if (name === 'email') finalValue = value.trim().toLowerCase();
    else finalValue = value.trim();

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, finalValue) }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setTouched(prev => ({ ...prev, resume: true }));
    setErrors(prev => ({ ...prev, resume: validateField('resume', selectedFile) }));
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrors(prev => ({ ...prev, resume: "Resume is required" }));
    if (inputRefs.resume.current) {
      inputRefs.resume.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formData.honeypot) {
      console.warn("Bot detected.");
      return;
    }

    setTouched({ name: true, email: true, phone: true, experience: true, resume: true });

    const newErrors = validateAll();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0] as keyof typeof inputRefs;
      inputRefs[firstErrorField]?.current?.focus();
      inputRefs[firstErrorField]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!careerId) {
      onComplete('error', "This role isn't accepting applications online yet. Please use the contact form.");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await publicApi.applyForVacancy(careerId, {
        applicant_name: formData.name.trim(),
        applicant_email: formData.email.trim().toLowerCase(),
        applicant_phone: formData.phone.replace(/[\s-]/g, ""),
        cover_letter: formData.experience?.trim() || undefined,
        resume: file as File,
      });
      onComplete('success');
    } catch (err) {
      onComplete('error', err instanceof ApiError ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (field: keyof FormTouched) => touched[field] && !errors[field];
  
  const getInputStyles = (field: keyof FormTouched) => {
    const base = "w-full px-4 py-3 rounded-xl border bg-white text-sm outline-none transition-all duration-300 text-[#102A43] font-medium ";
    if (errors[field]) return base + "border-red-500 bg-red-50 focus:ring-4 focus:ring-red-500/20 focus:border-red-500";
    if (isFieldValid(field)) return base + "border-green-500 focus:ring-4 focus:ring-[#087F5B]/20 focus:border-[#087F5B]";
    return base + "border-white/10 focus:ring-4 focus:ring-[#087F5B]/20 focus:border-[#087F5B] hover:border-white/10";
  };

  const isFormValid = Object.keys(validateAll()).length === 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 pt-8 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
      <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

      <div className="grid md:grid-cols-2 gap-x-6 gap-y-6 mb-8">
        {/* Full Name */}
        <div className="relative">
          <label htmlFor="name" className="text-xs font-bold text-white mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
            Full Name <span className="text-red-500 text-base leading-none">*</span>
          </label>
          <div className="relative">
            <input ref={inputRefs.name} id="name" name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} placeholder="Rahul Sharma" className={getInputStyles('name')} aria-invalid={!!errors.name} />
            {isFieldValid('name') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
          </div>
          {errors.name && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all animate-in fade-in"><AlertCircle size={14} /> {errors.name}</p>}
        </div>

        {/* Email Address */}
        <div className="relative">
          <label htmlFor="email" className="text-xs font-bold text-white mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
            Email Address <span className="text-red-500 text-base leading-none">*</span>
          </label>
          <div className="relative">
            <input ref={inputRefs.email} id="email" type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="rahul@company.com" className={getInputStyles('email')} aria-invalid={!!errors.email} />
            {isFieldValid('email') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all animate-in fade-in"><AlertCircle size={14} /> {errors.email}</p>}
        </div>

        {/* Phone Number */}
        <div className="relative">
          <label htmlFor="phone" className="text-xs font-bold text-white mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
            Phone Number <span className="text-red-500 text-base leading-none">*</span>
          </label>
          <div className="relative">
            <input ref={inputRefs.phone} id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} placeholder="+91 98765 43210" className={getInputStyles('phone')} aria-invalid={!!errors.phone} />
            {isFieldValid('phone') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all animate-in fade-in"><AlertCircle size={14} /> {errors.phone}</p>}
        </div>

        {/* Years of Experience */}
        <div className="relative">
          <label htmlFor="experience" className="text-xs font-bold text-white mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
            Years of Experience <span className="text-red-500 text-base leading-none">*</span>
          </label>
          <div className="relative">
            <input ref={inputRefs.experience} id="experience" type="text" name="experience" value={formData.experience} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. 5" className={getInputStyles('experience')} aria-invalid={!!errors.experience} />
            {isFieldValid('experience') && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
          </div>
          {errors.experience && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all animate-in fade-in"><AlertCircle size={14} /> {errors.experience}</p>}
        </div>

        {/* Resume Upload */}
        <div className="relative md:col-span-2">
          <label className="text-xs font-bold text-white mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
            Resume Upload <span className="text-red-500 text-base leading-none">*</span>
          </label>
          
          <input ref={inputRefs.resume} id="resume" type="file" name="resume" accept="application/pdf,.pdf" onChange={handleFileChange} className="hidden" />
          
          {!file ? (
            <label htmlFor="resume" className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${errors.resume ? 'border-red-500 bg-red-50 hover:bg-red-100' : 'border-white/10 bg-white/5 hover:border-[#087F5B] hover:bg-[#102A43]'}`}>
              <UploadCloud size={32} className={`mb-3 ${errors.resume ? 'text-red-500' : 'text-[#087F5B]'}`} />
              <p className="text-sm font-bold text-white mb-1" style={{ fontFamily: "Manrope" }}>Click to upload Resume</p>
              <p className="text-xs font-semibold text-[#94A3B8]" style={{ fontFamily: "Inter" }}>PDF only, max 5MB</p>
            </label>
          ) : (
            <div className={`flex items-center justify-between p-4 rounded-xl border ${errors.resume ? 'border-red-500 bg-red-50' : 'border-green-500 bg-white/5'}`}>
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${errors.resume ? 'bg-red-100' : 'bg-[#EAF4F0]'}`}>
                  <FileText size={24} className={errors.resume ? 'text-red-500' : 'text-[#087F5B]'} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate" style={{ fontFamily: "Manrope" }}>{file.name}</p>
                  <p className="text-xs font-semibold text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button type="button" onClick={handleRemoveFile} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove file">
                <Trash2 size={20} />
              </button>
            </div>
          )}
          {errors.resume && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1.5 transition-all animate-in fade-in"><AlertCircle size={14} /> {errors.resume}</p>}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-start">
        <button type="submit" disabled={isSubmitting || !isFormValid} className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-extrabold text-sm transition-all duration-300 ${isSubmitting || !isFormValid ? 'opacity-50 cursor-not-allowed saturate-50' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-[#087F5B]/30'}`} style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting Application...</>
          ) : (
            <>Submit Application <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </form>
  );
}

// Static fallback in the frontend's own shape, used if the API has no vacancies.
const FALLBACK_POSITIONS: Position[] = OPEN_POSITIONS.map(p => ({
  id: null, title: p.title, dept: p.dept, location: p.location, type: p.type,
}));

export function CareersPage({ setPage }: { setPage: (p: Page) => void }) {
  const [openApp, setOpenApp] = useState<number | null>(null);
  const [toast, setToast] = useState<{ status: 'success' | 'error', message: string } | null>(null);
  const [positions, setPositions] = useState<Position[]>(FALLBACK_POSITIONS);

  useEffect(() => {
    publicApi.careers()
      .then((careers: Career[]) => {
        if (careers.length) {
          setPositions(careers.map(c => ({
            id: c.id,
            title: c.title,
            dept: c.department ?? "—",
            location: c.location ?? "—",
            type: c.employment_type ?? "Full-time",
          })));
        }
      })
      .catch(() => { /* keep the static fallback list */ });
  }, []);

  const handleApplicationComplete = (status: 'success' | 'error', message?: string) => {
    if (status === 'success') {
      setToast({ status: 'success', message: "Application submitted successfully. Our HR team will contact you." });
      setOpenApp(null);
    } else {
      setToast({ status: 'error', message: message ?? "Submission failed. Please try again." });
    }
    setTimeout(() => setToast(null), 5000);
  };

  const benefits = [
    { icon: Award, title: "ICAI CPE Credits", desc: "Structured learning programs that count toward your CPE requirements." },
    { icon: TrendingUp, title: "Fast-Track Growth", desc: "Clear career paths with annual reviews and performance-based promotions." },
    { icon: Users, title: "Expert Mentorship", desc: "Work alongside senior partners with 15-20 years of diverse experience." },
    { icon: Globe, title: "Client Diversity", desc: "Exposure to 15+ industries and 1,500+ client businesses from day one." },
  ];

  return (
    <div className="pt-16">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'} ${toast?.status === 'success' ? 'bg-[#C8A45D] text-[#102A43]' : 'bg-red-600 text-white'}`}>
        {toast?.status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-medium" style={{ fontFamily: "Inter" }}>{toast?.message}</span>
      </div>

      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Careers</p>
            <h1 className="text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              Build Your Career at<br />
              <span style={{ color: "#087F5B" }}>Finovara</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              Join a team of 65+ professionals who are reshaping how India does financial advisory. We invest in people who combine technical excellence with a client-first mindset.
            </p>
            <button onClick={() => {
              document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' });
            }} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-[#087F5B]/30 transition-all duration-300 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Explore Opportunities <ArrowRight size={18} />
            </button>
          </div>
          <div>
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=450&fit=crop&auto=format" alt="Finovara team collaboration" className="rounded-3xl shadow-2xl w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="py-16" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <h2 className="text-3xl font-extrabold text-white mb-8" style={{ fontFamily: "Manrope" }}>Why Join Us</h2>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.3)] transition-all duration-300 hover:-translate-y-4 relative overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[#102A43] group-hover:bg-[#EAF4F0] transition-colors group-hover:scale-110">
                    <Icon size={22} className="text-[#94A3B8] group-hover:text-[#087F5B] transition-colors" />
                  </div>
                  <h4 className="font-bold text-white mb-2" style={{ fontFamily: "Manrope" }}>{title}</h4>
                  <p className="text-sm text-[#94A3B8] font-medium leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      <section id="open-positions" className="py-20 bg-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal direction="up">
          <h2 className="text-4xl font-extrabold text-white mb-10 text-center" style={{ fontFamily: "Manrope" }}>Open Positions</h2>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
          <div className="space-y-6">
            {positions.map((pos, i) => (
              <div key={i} className={`bg-[#102A43] rounded-[2rem] p-8 md:p-10 border transition-all duration-300 relative overflow-hidden group hover:-translate-y-3 ${openApp === i ? 'border-[#087F5B] shadow-[0_0_40px_rgba(8,127,91,0.3)]' : 'border-white/10 hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.3)]'}`}>
                <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-[2rem] transition-all duration-300"></div>
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
                  <div>
                    <h3 className="font-extrabold text-white text-2xl mb-3" style={{ fontFamily: "Manrope" }}>{pos.title}</h3>
                    <div className="flex flex-wrap items-center gap-5">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                        <Briefcase size={16} style={{ color: "#087F5B" }} /> {pos.dept}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                        <MapPin size={16} style={{ color: "#087F5B" }} /> {pos.location}
                      </span>
                      <span className="text-xs font-bold px-4 py-1.5 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{pos.type}</span>
                    </div>
                  </div>
                  <button onClick={() => setOpenApp(openApp === i ? null : i)}
                    className={`px-8 py-3.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer whitespace-nowrap ${openApp === i ? 'bg-[#102A43] hover:bg-[#102A43]/90' : 'bg-[#087F5B] hover:bg-[#065a40]'}`}
                    style={{ fontFamily: "Inter" }}>
                    {openApp === i ? 'Close Form' : 'Apply Now'}
                  </button>
                </div>
                
                {/* Application Form */}
                <div className="relative z-10">
                  {openApp === i && <ApplicationForm positionTitle={pos.title} careerId={pos.id} onComplete={handleApplicationComplete} />}
                </div>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}