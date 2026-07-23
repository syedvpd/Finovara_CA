"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { publicApi, DownloadItem } from "../../services/public";

export function ResourcesPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.downloads()
      .then(setDownloads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (item: DownloadItem) => {
    if (item.file_url) {
      window.open(item.file_url, "_blank", "noopener");
    }
  };

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Downloads</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Free Resources</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Tools, guides, and checklists to support your compliance journey</p>
        </div>
      </section>
      <section className="py-20" style={{ background: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading && <div className="flex justify-center py-20 text-[#94A3B8] gap-2"><Loader2 size={18} className="animate-spin" /> Loading resources…</div>}
          {!loading && downloads.length === 0 && <p className="text-center text-[#94A3B8] py-20">No resources available yet.</p>}
          {!loading && downloads.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {downloads.map((item) => (
                <div key={item.id} className="group bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#087F5B]/20 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                      <FileText size={22} style={{ color: "#087F5B" }} />
                    </div>
                  </div>
                  <h3 className="font-bold text-[#102A43] mb-2" style={{ fontFamily: "Manrope" }}>{item.title}</h3>
                  <p className="text-sm text-[#52606D] mb-4" style={{ fontFamily: "Inter" }}>{item.description}</p>
                  <button onClick={() => handleDownload(item)} disabled={!item.file_url} className="flex items-center gap-2 text-sm font-semibold text-[#087F5B] group-hover:underline disabled:opacity-40" style={{ fontFamily: "Inter" }}>
                    <Download size={16} /> Download Free
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}