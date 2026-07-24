import { useState, useEffect } from "react";
import { Star, Quote, Loader2 } from "lucide-react";
import { publicApi, Testimonial } from "../../services/public";
import { TESTIMONIALS } from "../../utils/constants";
import { Reveal } from "../../components/animations/Reveal";

export function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.testimonials()
      .then((data) => { if (data.length) setTestimonials(data); else setTestimonials(TESTIMONIALS.map((t, i) => ({ id: String(i), author_name: t.name, author_title: t.role, content: t.text, rating: t.rating })) as Testimonial[]); })
      .catch(() => setTestimonials(TESTIMONIALS.map((t, i) => ({ id: String(i), author_name: t.name, author_title: t.role, content: t.text, rating: t.rating })) as Testimonial[]))
      .finally(() => setLoading(false));
  }, []);

  const featured = testimonials[0];
  const rest = testimonials.slice(1);

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Stories</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>What Our Clients Say</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Trusted by 1,500+ businesses across India</p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-8 border-b border-[#E2E8F0]" style={{ background: "#F8FAFC" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "1,500+", label: "Businesses Served" },
              { value: "96%", label: "Client Retention" },
              { value: "7+ yrs", label: "Avg. Client Tenure" },
              { value: "4.9 / 5", label: "Average Rating" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold" style={{ color: "#087F5B", fontFamily: "Manrope" }}>{s.value}</div>
                <div className="text-sm text-[#52606D] mt-1" style={{ fontFamily: "Inter" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials grid */}
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading && <div className="flex justify-center py-20 text-[#94A3B8] gap-2"><Loader2 size={18} className="animate-spin" /> Loading testimonials…</div>}
          {!loading && (
            <Reveal direction="up">
              {/* Featured testimonial */}
              {featured && (
                <div className="mb-10 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-6 items-start" style={{ background: "linear-gradient(135deg, #102A43, #065a40)" }}>
                  <Quote size={48} className="shrink-0 opacity-40" style={{ color: "#C8A45D" }} />
                  <div className="flex-1">
                    <p className="text-white text-lg md:text-xl leading-relaxed mb-6" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>"{featured.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "#C8A45D", fontFamily: "Manrope" }}>
                        {featured.author_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white" style={{ fontFamily: "Manrope" }}>{featured.author_name}</div>
                        <div className="text-sm text-white/60" style={{ fontFamily: "Inter" }}>{featured.author_title}</div>
                      </div>
                      <div className="ml-auto flex">
                        {Array.from({ length: featured.rating ?? 5 }).map((_, j) => (
                          <Star key={j} size={14} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rest of testimonials */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B] hover:shadow-[0_0_40px_rgba(8,127,91,0.3)] transition-all duration-300 hover:-translate-y-4 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-[#087F5B]/60 rounded-2xl transition-all duration-300"></div>
                    <div className="relative z-10">
                      <Quote size={28} style={{ color: "#087F5B" }} className="mb-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[#52606D] leading-relaxed mb-6 text-sm" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>"{t.content}"</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                          {t.author_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#102A43]" style={{ fontFamily: "Manrope" }}>{t.author_name}</div>
                          <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{t.author_title}</div>
                        </div>
                        <div className="ml-auto flex">
                          {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                            <Star key={j} size={12} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center" style={{ background: "#F8FAFC" }}>
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-[#102A43] mb-3" style={{ fontFamily: "Manrope" }}>Ready to Join Our Client Family?</h2>
          <p className="text-[#52606D] mb-6" style={{ fontFamily: "Inter" }}>Experience the Finovara difference — proactive, expert, and always on your side.</p>
          <a href="/book" className="inline-block px-8 py-3 rounded-full font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
            Book a Free Consultation
          </a>
        </div>
      </section>
    </div>
  );
}