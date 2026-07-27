"use client";
import { useCountUp } from "@/hooks/useCountUp";

export function StatCard({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCountUp(value, 2200, started);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm font-medium uppercase tracking-widest" style={{ color: "#C8A45D" }}>{label}</div>
    </div>
  );
}
