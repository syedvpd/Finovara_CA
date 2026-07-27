"use client";
import { useNavigate } from "@/hooks/useNavigate";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold mb-4" style={{ color: "#087F5B", fontFamily: "Manrope" }}>404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>Page Not Found</h1>
        <p className="text-gray-600 mb-8" style={{ fontFamily: "Inter" }}>The page you're looking for doesn't exist or has been moved.</p>
        <button onClick={() => navigate("home")}
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
