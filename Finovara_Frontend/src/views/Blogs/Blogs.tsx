import { useState, useEffect } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { publicApi, Blog } from "../../services/public";
import { ArticleModal } from "../../components/modals/ArticleModal";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format";

export function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  useEffect(() => {
    publicApi.blogs()
      .then(setBlogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = blogs;

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Blog</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Financial Insights Blog</h1>
            <p className="text-white/70" style={{ fontFamily: "Inter" }}>Expert commentary, tax updates, and compliance guidance from our advisory team.</p>
          </div>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading && (
            <div className="flex justify-center py-20 text-[#94A3B8] gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading articles…
            </div>
          )}
          {!loading && blogs.length === 0 && (
            <p className="text-center text-[#94A3B8] py-20">No articles published yet.</p>
          )}
          {!loading && featured && (
            <div className="mb-12 bg-white rounded-3xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all grid md:grid-cols-2">
              <img src={featured.cover_image_url || FALLBACK_IMG} alt={featured.title} className="w-full h-full object-cover" />
              <div className="p-8 flex flex-col justify-center">
                <span className="text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block self-start" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>Featured Article</span>
                <h2 className="text-3xl font-extrabold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>{featured.title}</h2>
                <p className="text-[#94A3B8] leading-relaxed mb-6" style={{ fontFamily: "Inter" }}>{featured.excerpt}</p>
                <button onClick={() => setSelectedArticle({ title: featured.title, excerpt: featured.excerpt, content: featured.content, date: featured.published_at ? new Date(featured.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "", readTime: featured.read_time_minutes ? `${featured.read_time_minutes} min read` : "" })} className="inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B]" style={{ fontFamily: "Inter" }}>Read Full Article <ArrowRight size={14} /></button>
              </div>
            </div>
          )}
          {!loading && rest.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {rest.map((article) => (
                <div key={article.id} className="group bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="h-48 bg-[#EEF1F5] overflow-hidden">
                    <img src={article.cover_image_url || FALLBACK_IMG} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-[#102A43] mb-2 leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                    <p className="text-sm text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                      <span>{article.read_time_minutes ? `${article.read_time_minutes} min read` : ""}</span>
                      <button onClick={() => setSelectedArticle({ title: article.title, excerpt: article.excerpt, content: article.content, date: article.published_at ? new Date(article.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "" })} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline">Read Full Article <ArrowRight size={12} /></button>
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