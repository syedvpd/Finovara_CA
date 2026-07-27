"use client";
import { useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";
import { TESTIMONIALS } from "@/utils/constants";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";
import type { Testimonial } from "@/services/public";

export function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    publicApi.testimonials()
      .then(d => {
        if (d.length) setTestimonials(d.map((t: Testimonial) => ({
          name: t.author_name,
          role: t.author_title ?? "",
          text: t.content,
          avatar: t.author_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          rating: t.rating ?? 5,
        })));
      })
      .catch(() => {});
  }, []);

  const display = testimonials.length ? testimonials : TESTIMONIALS;

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Stories</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>What Our Clients Say</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Trusted by 1,500+ businesses across India.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {display.map((t, i) => (
              <Reveal key={i} direction="up">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-[#087F5B] hover:shadow-lg transition-all flex flex-col gap-4">
                  <Quote size={28} style={{ color: "#087F5B" }} className="opacity-30" />
                  <p className="text-gray-700 leading-relaxed flex-1 italic" style={{ fontFamily: "Playfair Display" }}>"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                      {t.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm truncate" style={{ fontFamily: "Manrope" }}>{t.name}</div>
                      <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "Inter" }}>{t.role}</div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                        <Star key={j} size={13} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
