import { LucideIcon } from "lucide-react";

interface DashboardMetricProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

export function DashboardMetric({ label, value, icon: Icon, color, trend }: DashboardMetricProps) {
  return (
    <div className="rounded-2xl p-5 bg-white/5 border border-white/10 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B" }}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold text-white mb-1" style={{ fontFamily: "Manrope" }}>{value}</div>
      <div className="text-xs font-medium text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{label}</div>
    </div>
  );
}