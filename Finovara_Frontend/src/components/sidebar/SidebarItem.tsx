import { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}

export function SidebarItem({ label, icon: Icon, isActive, onClick, badge }: SidebarItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${
        isActive 
          ? "text-white shadow-sm" 
          : "text-[#94A3B8] hover:bg-[#102A43] hover:text-white"
      }`}
      style={isActive ? { background: "linear-gradient(135deg, #102A43, #0d3355)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
    >
      <div className="flex items-center gap-3">
        <Icon size={15} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.2)" : "#EAF4F0", color: isActive ? "white" : "#087F5B" }}>
          {badge}
        </span>
      )}
    </button>
  );
}