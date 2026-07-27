"use client";
import { useState, useEffect } from "react";
import { Clock, Tag, ArrowRight } from "lucide-react";
import { INSIGHTS } from "@/utils/constants";
import { ArticleModal } from "@/components/modals/ArticleModal";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";
import type { Blog } from "@/services/public";

export function InsightsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    publicApi.blogs()
      .then(d => setBlogs(d.map((b: Blog) => ({
        title: b.title,
        tag: b.category_id ?? "Article",
        date: b.published_at ? new Date(b.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
        excerpt: b.excerpt ?? "",
        readTime: b.read_time_minutes ? `${b.read_time_minutes} min read` : "",
        cover: b.cover_image_url,
        _raw: b,
      }))))
      .catch(() => setBlogs(INSIGHTS.map(i => ({ ...i, cover: null, _raw: i }))));
  }, []);

  const display = blogs.length ? blogs : INSIGHTS.map(i => ({ ...i, cover: null, _raw: i }));
  const tags = ["All", ...Array.from(new Set(display.map(b => b.tag)))];
  const filtered = filter === "All" ? display : display.filter(b => b.tag === filter);

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Knowledge Hub</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Insights & Updates</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>Expert commentary on tax, GST, compliance, and financial strategy.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 mb-10">
            {tags.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === t ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                style={{ background: filter === t ? "#087F5B" : undefined, fontFamily: "Inter" }}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => (
              <Reveal key={i} direction="up">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#087F5B] transition-all cursor-pointer group"
                  onClick={() => setSelected(article)}>
                  {article.cover ? (
                    <img src={article.cover} alt={article.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #EAF4F0, #d1ede6)" }}>
                      <span className="text-4xl font-extrabold" style={{ color: "#087F5B", fontFamily: "Manrope" }}>{article.tag?.[0]}</span>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>
                        <Tag size={11} />{article.tag}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1 text-xs text-gray-500" style={{ fontFamily: "Inter" }}>
                          <Clock size={11} />{article.readTime}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#087F5B] transition-colors" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400" style={{ fontFamily: "Inter" }}>{article.date}</span>
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#087F5B", fontFamily: "Inter" }}>Read More <ArrowRight size={12} /></span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ArticleModal article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
