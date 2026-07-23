"use client";

import { useState, FormEvent, useEffect } from "react";
import { Shield, Lock, Users, FileText, Clock, AlertCircle, Globe, Star, CheckCircle, Loader2, ArrowLeft, Mail, Key, Eye, EyeOff, Smartphone } from "lucide-react";
import { Page } from "../../types/index";
import { useAuth, landingPage } from "../../context";
import { sendOtp, requestPasswordReset } from "../../services/auth";
import { ApiError } from "../../lib/api";

type AuthView = 'login' | 'otp' | 'forgot';

export function LoginPage({ setPage }: { setPage: (p: Page) => void }) {
  const { login, verifyOtp } = useAuth();
  const [view, setView] = useState<AuthView>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    return (v === 'otp' || v === 'forgot') ? (v as AuthView) : 'login';
  });
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      setView((v === 'otp' || v === 'forgot') ? (v as AuthView) : 'login');
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [errors, setErrors] = useState<{ email?: string, password?: string, otp?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean, password?: boolean, otp?: boolean }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Soft Validation Logic ---
  const validateField = (field: 'email' | 'password' | 'otp', value: string) => {
    if (field === 'email') {
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
      return "";
    }
    if (field === 'password') {
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
      return "";
    }
    if (field === 'otp') {
      if (!value) return "OTP is required";
      if (value.length !== 6 || !/^\d+$/.test(value)) return "Enter a valid 6-digit OTP";
      return "";
    }
    return "";
  };

  const handleBlur = (field: 'email' | 'password' | 'otp') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let val = email;
    if (field === 'email') {
      val = email.trim().toLowerCase();
      setEmail(val);
    } else if (field === 'password') {
      val = password;
    } else if (field === 'otp') {
      val = otp;
    }
    setErrors(prev => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleChange = (field: 'email' | 'password' | 'otp', val: string) => {
    if (field === 'email') setEmail(val);
    else if (field === 'password') setPassword(val);
    else if (field === 'otp') {
      const sanitized = val.replace(/\D/g, '').slice(0, 6);
      setOtp(sanitized);
      val = sanitized;
    }
    
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, val) }));
    }
  };

  const resetView = (newView: AuthView) => {
    setView(newView);
    setErrors({});
    setTouched({});
    setOtp("");
    setOtpSent(false);
    setResetSent(false);
    setIsSubmitting(false);
    setAuthError("");

    const url = new URL(window.location.href);
    if (newView === 'login') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', newView);
    }
    window.history.pushState({}, '', url);
  };

  const errText = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched({ email: true, password: true });
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setAuthError("");
    try {
      const session = await login(email, password);
      setPage(landingPage(session));
    } catch (err) {
      setAuthError(errText(err, "Sign in failed. Please try again."));
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched({ email: true, otp: otpSent });
    const emailError = validateField('email', email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setAuthError("");

    if (!otpSent) {
      setIsSubmitting(true);
      try {
        await sendOtp(email);
        setOtpSent(true);
      } catch (err) {
        setAuthError(errText(err, "Could not send OTP. Please try again."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const otpError = validateField('otp', otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await verifyOtp(email, otp);
      setPage(landingPage(session));
    } catch (err) {
      setAuthError(errText(err, "OTP verification failed."));
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched({ email: true });
    const emailError = validateField('email', email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);
    setAuthError("");
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setAuthError(errText(err, "Could not send reset link. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputStyles = (field: 'email' | 'password' | 'otp') => {
    const base = "w-full pl-12 pr-4 h-[56px] rounded-[14px] border bg-white text-[15px] outline-none transition-all duration-300 text-[#102A43] font-medium placeholder:text-gray-400 ";
    if (errors[field]) return base + "border-[#EF4444] bg-red-50/30 focus:ring-4 focus:ring-[#EF4444]/15 focus:border-[#EF4444]";
    return base + "border-[#D6E2F0] focus:ring-4 focus:ring-[#059669]/15 focus:border-[#059669] hover:border-[#059669] hover:shadow-[0_0_8px_rgba(5,150,105,0.15)]";
  };

  return (
    <div className="pt-16 min-h-screen grid lg:grid-cols-2">
      {/* Left Form Area */}
      <div className="flex flex-col justify-center px-8 py-8 lg:px-16 relative" style={{ background: "#ffffff" }}>
        
        <div className="max-w-md mx-auto w-full relative">
          
          {/* Back Button (Only on OTP / Forgot views) */}
          {view !== 'login' && (
            <button 
              onClick={() => resetView('login')}
              className="absolute -top-12 left-0 flex items-center gap-2 text-[#94A3B8] hover:text-[#102A43] text-sm font-bold transition-colors group"
              style={{ fontFamily: "Inter" }}
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
            </button>
          )}

          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-base" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight" style={{ fontFamily: "Manrope", color: "#102A43" }}>Finovara</span>
              <span className="block text-[10px] font-semibold text-[#475569] uppercase tracking-wider mt-0.5" style={{ fontFamily: "Inter" }}>Chartered Accountants LLP</span>
            </div>
          </div>

          {authError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {authError}
            </div>
          )}

          {view === 'login' && (
            <>
              <h1 className="text-2xl font-extrabold text-[#102A43] mb-2 animate-in fade-in slide-in-from-bottom-2" style={{ fontFamily: "Manrope" }}>Sign in to your account</h1>
              <p className="text-[#475569] text-sm mb-6 animate-in fade-in slide-in-from-bottom-2" style={{ fontFamily: "Inter" }}>Access your documents, compliance calendar, and service status securely.</p>

              <form onSubmit={handleLoginSubmit} noValidate className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-5 mb-6">
                  {/* Email Field */}
                  <div className="relative group">
                    <label htmlFor="email" className="text-xs font-bold text-[#475569] mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                      Email Address <span className="text-[#EF4444] text-base leading-none">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${errors.email ? 'text-[#EF4444]' : 'text-gray-400 group-focus-within:text-[#059669]'}`} />
                      <input 
                        id="email" type="email" value={email} 
                        onChange={e => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        placeholder="your@email.com"
                        className={getInputStyles('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[#EF4444] text-xs mt-2 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 transition-all">
                        <AlertCircle size={14} /> {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="relative group">
                    <label htmlFor="password" className="text-xs font-bold text-[#475569] mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                      Password <span className="text-[#EF4444] text-base leading-none">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${errors.password ? 'text-[#EF4444]' : 'text-gray-400 group-focus-within:text-[#059669]'}`} />
                      <input 
                        id="password" type={showPassword ? "text" : "password"} value={password} 
                        onChange={e => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="Enter your password"
                        className={`${getInputStyles('password')} pr-12`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#059669] transition-colors focus:outline-none">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[#EF4444] text-xs mt-2 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 transition-all">
                        <AlertCircle size={14} /> {errors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <label className="flex items-center gap-3 text-sm font-medium text-[#64748B] cursor-pointer group select-none" style={{ fontFamily: "Inter" }}>
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="checkbox" className="peer w-full h-full appearance-none border-2 border-[#CBD5E1] rounded-[6px] checked:bg-[#059669] checked:border-[#059669] transition-all duration-300 cursor-pointer group-hover:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:ring-offset-1" />
                      <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all duration-300 scale-50 peer-checked:scale-100" />
                    </div>
                    Remember me
                  </label>
                  <button type="button" onClick={() => resetView('forgot')} className="text-sm font-medium text-[#059669] relative group overflow-hidden" style={{ fontFamily: "Inter" }}>
                    Forgot Password?
                    <span className="absolute left-0 bottom-0 w-full h-[1.5px] bg-[#059669] transform origin-left scale-x-0 transition-transform duration-250 ease-out group-hover:scale-x-100"></span>
                  </button>
                </div>

                <button type="submit" disabled={isSubmitting || !email.trim() || !password}
                  className={`w-full h-[56px] flex items-center justify-center gap-3 rounded-[14px] text-white font-semibold text-base mb-5 transition-all duration-300 ${isSubmitting || !email.trim() || !password ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#0F766E] to-[#059669] shadow-md hover:shadow-xl hover:shadow-[#059669]/25 hover:-translate-y-[2px] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer'}`}
                  style={{ fontFamily: "Inter" }}>
                  {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <>Sign In</>}
                </button>
              </form>

              <div className="flex items-center gap-4 mb-5 opacity-60">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#64748B]" style={{ fontFamily: "Inter" }}>or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              <button type="button" onClick={() => resetView('otp')}
                className="w-full h-[56px] flex items-center justify-center gap-3 rounded-[14px] border-2 border-[#059669] bg-transparent text-[#059669] font-semibold text-base transition-all duration-300 hover:bg-gradient-to-r hover:from-[#0F766E] hover:to-[#059669] hover:border-transparent hover:text-white hover:shadow-lg hover:shadow-[#059669]/25 hover:-translate-y-[1px] hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#059669]/20" 
                style={{ fontFamily: "Inter" }}>
                <Smartphone size={20} className="mb-0.5" />
                Sign in with OTP
              </button>
            </>
          )}

          {view === 'otp' && (
            <>
              <h1 className="text-2xl font-extrabold text-[#102A43] mb-2 animate-in fade-in slide-in-from-right-4" style={{ fontFamily: "Manrope" }}>Sign in with OTP</h1>
              <p className="text-[#475569] text-sm mb-6 animate-in fade-in slide-in-from-right-4" style={{ fontFamily: "Inter" }}>We'll send a secure one-time password to your email.</p>

              <form onSubmit={handleOtpSubmit} noValidate className="animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="space-y-5 mb-6">
                  <div className="relative group">
                    <label htmlFor="otp-email" className="text-xs font-bold text-[#475569] mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                      Email Address <span className="text-[#EF4444] text-base leading-none">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${errors.email ? 'text-[#EF4444]' : 'text-gray-400 group-focus-within:text-[#059669]'}`} />
                      <input 
                        id="otp-email" type="email" value={email} 
                        onChange={e => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        placeholder="your@email.com"
                        className={getInputStyles('email')}
                        disabled={otpSent}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[#EF4444] text-xs mt-2 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 transition-all">
                        <AlertCircle size={14} /> {errors.email}
                      </p>
                    )}
                  </div>

                  {otpSent && (
                    <div className="relative group animate-in fade-in slide-in-from-top-4 duration-300">
                      <label htmlFor="otp" className="text-xs font-bold text-[#475569] mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                        6-Digit OTP <span className="text-[#EF4444] text-base leading-none">*</span>
                      </label>
                      <div className="relative">
                        <Key size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${errors.otp ? 'text-[#EF4444]' : 'text-gray-400 group-focus-within:text-[#059669]'}`} />
                        <input 
                          id="otp" type="text" value={otp} maxLength={6}
                          onChange={e => handleChange('otp', e.target.value)}
                          onBlur={() => handleBlur('otp')}
                          placeholder="000000"
                          className={`${getInputStyles('otp')} tracking-[0.5em] text-center font-bold text-lg`}
                        />
                      </div>
                      {errors.otp && (
                        <p className="text-[#EF4444] text-xs mt-2 font-medium flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 transition-all">
                          <AlertCircle size={14} /> {errors.otp}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting || !email.trim() || (otpSent && otp.length !== 6)}
                  className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-extrabold text-sm mb-5 transition-all duration-300 ${isSubmitting || !email.trim() || (otpSent && otp.length !== 6) ? 'opacity-50 cursor-not-allowed saturate-50' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-[#087F5B]/30'}`}
                  style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> {otpSent ? "Verifying..." : "Sending..."}</>
                  ) : (
                    <>{otpSent ? "Verify & Sign In" : "Send OTP"}</>
                  )}
                </button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <>
              <h1 className="text-2xl font-extrabold text-[#102A43] mb-2 animate-in fade-in slide-in-from-left-4" style={{ fontFamily: "Manrope" }}>Reset Password</h1>
              <p className="text-[#475569] text-sm mb-6 animate-in fade-in slide-in-from-left-4" style={{ fontFamily: "Inter" }}>Enter your email address and we'll send you a link to reset your password.</p>

              {resetSent ? (
                <div className="bg-[#EAF4F0] border border-[#087F5B]/20 rounded-xl p-6 text-center animate-in fade-in slide-in-from-top-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-[#087F5B]">
                    <Mail size={24} />
                  </div>
                  <h3 className="font-extrabold text-[#102A43] mb-2" style={{ fontFamily: "Manrope" }}>Check your inbox</h3>
                  <p className="text-[#475569] text-sm mb-6" style={{ fontFamily: "Inter" }}>
                    We've sent a password reset link to <br/>
                    <span className="font-bold text-[#102A43]">{email}</span>
                  </p>
                  <button type="button" onClick={() => resetView('login')} className="text-sm font-bold text-[#059669] hover:underline" style={{ fontFamily: "Inter" }}>
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} noValidate className="animate-in fade-in slide-in-from-left-8 duration-500">
                  <div className="space-y-5 mb-6">
                    <div className="relative group">
                      <label htmlFor="forgot-email" className="text-xs font-bold text-[#475569] mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>
                        Email Address <span className="text-[#EF4444] text-base leading-none">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${errors.email ? 'text-[#EF4444]' : 'text-gray-400 group-focus-within:text-[#059669]'}`} />
                        <input 
                          id="forgot-email" type="email" value={email} 
                          onChange={e => handleChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          placeholder="your@email.com"
                          className={getInputStyles('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-[#EF4444] text-xs mt-2 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 transition-all">
                          <AlertCircle size={14} /> {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting || !email.trim()}
                    className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-extrabold text-sm mb-5 transition-all duration-300 ${isSubmitting || !email.trim() ? 'opacity-50 cursor-not-allowed saturate-50' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-[#087F5B]/30'}`}
                    style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Sending Link...</>
                    ) : (
                      <>Send Reset Link</>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Registration Link (Shown on all views at bottom) */}
          <p className="text-center text-sm font-medium text-[#64748B] mt-6" style={{ fontFamily: "Inter" }}>
            New client?{" "}
            <button type="button" onClick={() => setPage("contact")} className="font-bold text-[#059669] hover:text-[#0F766E] transition-colors hover:underline">
              Request Portal Access
            </button>
          </p>
        </div>
      </div>

      {/* Right — Security showcase */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-8" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-2xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 border border-white/10 bg-white/5 backdrop-blur-sm shadow-sm">
            <Shield size={14} style={{ color: "#087F5B" }} />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest" style={{ fontFamily: "Inter" }}>Bank-Grade Security</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: "Manrope" }}>
            Your Data,<br />
            <span style={{ color: "#087F5B" }}>Fully Protected</span>
          </h2>
          <p className="text-white/60 leading-relaxed mb-8 text-sm font-medium max-w-md" style={{ fontFamily: "Inter" }}>
            Every interaction is secured with enterprise-grade protection. Your financial data is encrypted, monitored, and access-controlled at every level.
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { icon: Shield,       label: "Two-Factor Auth",             desc: "OTP + authenticator app" },
              { icon: Lock,         label: "Secure File Links",            desc: "Time-limited, signed URLs" },
              { icon: Users,        label: "Role-Based Access",            desc: "Granular permissions per user" },
              { icon: FileText,     label: "Audit Logs",                   desc: "Full activity trail for actions" },
              { icon: Clock,        label: "File-Version History",         desc: "Restore previous versions" },
              { icon: AlertCircle,  label: "Session Timeout",              desc: "Auto-logout on inactivity" },
              { icon: Globe,        label: "Login Tracking",               desc: "Alerts for new device sign-ins" },
              { icon: Star,         label: "Encrypted Data",               desc: "AES-256 at rest and transit" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.2)" }}>
                  <Icon size={14} style={{ color: "#087F5B" }} />
                </div>
                <div>
                  <div className="font-bold text-white text-xs mb-0.5 tracking-wide" style={{ fontFamily: "Manrope" }}>{label}</div>
                  <div className="text-[11px] font-medium text-white/50 leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}