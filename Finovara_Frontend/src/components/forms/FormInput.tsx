"use client";

import { InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormInput({ label, error, required, className = "", ...props }: FormInputProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-white mb-1.5" style={{ fontFamily: "Inter" }}>
        {label} {required && <span className="text-[#e53e3e]">*</span>}
      </label>
      <input 
        className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          error 
            ? "border-[#e53e3e] bg-[#FFF0F0] focus:ring-[#e53e3e]/30 focus:border-[#e53e3e]" 
            : "border-white/10 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-[#e53e3e] animate-in fade-in">{error}</p>}
    </div>
  );
}