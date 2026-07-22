import { BarChart2, TrendingUp } from "lucide-react";

export function RevenueChart({ data }: { data?: any }) {
  return (
    <div className="p-5 bg-[#102A43] rounded-2xl border border-white/10 hover:border-[#087F5B]/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-white" style={{ fontFamily: "Manrope" }}>Revenue Overview</h4>
        <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#EAF4F0] text-[#087F5B]">
          <TrendingUp size={12} /> +12.5%
        </div>
      </div>
      <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl">
        <div className="text-center">
          <BarChart2 size={32} className="mx-auto mb-2 text-[#94A3B8]/50" />
          <p className="text-xs text-[#94A3B8] font-medium">Chart Visualization Rendered Here</p>
        </div>
      </div>
    </div>
  );
}