import { Calendar, ChevronRight, Lock, UploadCloud } from "lucide-react";
import { Page } from "../../types/index";

export function HeroSection({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "#ffffff" }}>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      </div>
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10"
        style={{ background: "radial-gradient(ellipse at top right, #087F5B, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-10"
        style={{ background: "radial-gradient(ellipse at bottom left, #C8A45D, transparent 70%)" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#087F5B" }} />
            <span className="text-xs font-semibold uppercase tracking-widest text-black" style={{ fontFamily: "Inter" }}>
              Chartered Accountants & Financial Advisors
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] mb-6" style={{ fontFamily: "Manrope" }}>
            Financial Clarity for{" "}
            <span style={{ color: "#C8A45D", fontFamily: "Playfair Display", fontStyle: "italic" }}>Confident</span>{" "}
            Business Decisions
          </h1>

          <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl" style={{ fontFamily: "Inter" }}>
            Professional Tax, Audit, GST, Accounting, Payroll, Compliance, and Virtual CFO solutions delivered through expert guidance and secure digital workflows.
          </p>

          <div className="flex flex-wrap gap-4">
            <button onClick={() => setPage("book")}
              className="flex items-center gap-2 px-7 py-4 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:shadow-2xl hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              <Calendar size={18} />
              Book Consultation
            </button>
            <button onClick={() => setPage("services")}
              className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/20 text-white hover:bg-white/10"
              style={{ fontFamily: "Inter" }}>
              Explore Services
              <ChevronRight size={18} />
            </button>
            <button onClick={() => setPage("login")}
              className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              style={{ fontFamily: "Inter" }}>
              <Lock size={16} />
              Client Login
            </button>
            <button onClick={() => setPage("login")}
              className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              style={{ fontFamily: "Inter" }}>
              <UploadCloud size={16} />
              Upload Documents
            </button>
          </div>
        </div>

        <div className="relative lg:h-[600px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#087F5B]/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
                <span className="text-white font-bold text-2xl" style={{ fontFamily: "Manrope" }}>F</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Manrope" }}>Finovara Portal</h3>
                <p className="text-sm text-white/60" style={{ fontFamily: "Inter" }}>Secure Client Access</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Document Vault", value: "Secure Storage", icon: UploadCloud, color: "#087F5B" },
                { label: "Compliance", value: "Real-time Tracking", icon: Lock, color: "#C8A45D" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20` }}>
                      <item.icon size={18} style={{ color: item.color }} />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/90">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
