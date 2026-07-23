"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { publicApi, Blog } from "../../services/public";
import { ArticleModal } from "../../components/modals/ArticleModal";

const FALLBACK_IMG_A = "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format";
const FALLBACK_IMG_B = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop&auto=format";

export function InsightsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  useEffect(() => {
    publicApi.blogs()
      .then(setBlogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(blogs.map(b => b.category_id).filter(Boolean)))];

  const displayed = (activeTab === "all" ? blogs : blogs.filter(b => b.category_id === activeTab)).slice(0, 6);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Knowledge Hub</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Insights & Analysis</h1>
            <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Expert commentary on tax, compliance, and financial strategy from our senior advisory team.</p>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 mb-10 flex-wrap">
            {categories.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                style={{ background: activeTab === tab ? "#087F5B" : "white", color: activeTab === tab ? "white" : "#52606D", fontFamily: "Inter", border: "1px solid", borderColor: activeTab === tab ? "#087F5B" : "rgba(0,0,0,0.08)" }}>
                {tab === "all" ? "All Topics" : tab}
              </button>
            ))}
          </div>

          {loading && <div className="flex justify-center py-20 text-[#94A3B8] gap-2"><Loader2 size={18} className="animate-spin" /> Loading articles…</div>}
          {!loading && displayed.length === 0 && <p className="text-center text-[#94A3B8] py-20">No articles found.</p>}
          {!loading && (
            <div className="grid md:grid-cols-3 gap-6">
              {displayed.map((article, i) => (
                <div key={article.id} className="group bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="h-48 overflow-hidden bg-[#EEF1F5]">
                    <img src={article.cover_image_url || (i % 2 === 0 ? FALLBACK_IMG_A : FALLBACK_IMG_B)} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {article.category_id && <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{article.category_id}</span>}
                      {article.published_at && <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{new Date(article.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                    </div>
                    <h3 className="font-bold text-[#102A43] mb-2 text-lg leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                    <p className="text-sm text-[#94A3B8] leading-relaxed mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.read_time_minutes ? `${article.read_time_minutes} min read` : ""}</span>
                      <button onClick={() => setSelectedArticle({ title: article.title, excerpt: article.excerpt, content: article.content, date: article.published_at ? new Date(article.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "" })} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline">Read More <ArrowRight size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}