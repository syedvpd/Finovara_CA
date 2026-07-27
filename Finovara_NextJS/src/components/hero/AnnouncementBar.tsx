"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();
  if (!visible) return null;
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2 text-xs font-medium relative" style={{ background: "linear-gradient(90deg, #087F5B, #065a40)", color: "white" }}>
      <span style={{ fontFamily: "Inter" }}>
        <span className="font-semibold">New:</span> Budget 2025 — Key Changes Affecting Your Business.{" "}
        <button onClick={() => navigate("insights")} className="underline underline-offset-2 hover:no-underline">Read Our Analysis →</button>
      </span>
      <button onClick={() => setVisible(false)} className="absolute right-4 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
