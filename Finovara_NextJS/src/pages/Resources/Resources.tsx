"use client";
import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { publicApi } from "@/services/public";
import { handleDownloadResource } from "@/utils/helpers";

export function ResourcesPage() {
  const [downloads, setDownloads] = useState<any[]>([]);

  const STATIC = [
    { title: "Firm Profile 2025", description: "Overview of Finovara's services, team, and track record." },
    { title: "GST Compliance Checklist", description: "Monthly and quarterly GST filing checklist for businesses." },
    { title: "Income Tax Calendar FY 2024-25", description: "All key due dates for income tax compliance." },
    { title: "Startup Compliance Roadmap", description: "Step-by-step compliance guide for early-stage companies." },
    { title: "Virtual CFO Services Brochure", description: "Detailed overview of our Virtual CFO engagement model." },
    { title: "Audit Workflow Guide", description: "How our structured audit process works end-to-end." },
  ];

  useEffect(() => {
    publicApi.downloads()
      .then(d => { if (d.length) setDownloads(d); })
      .catch(() => {});
  }, []);

  const display = downloads.length
    ? downloads.map(d => ({ title: d.title, description: d.description ?? "", file_url: d.file_url }))
    : STATIC.map(s => ({ ...s, file_url: null }));

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Free Downloads</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>Resources</h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Guides, checklists, and brochures to help you stay compliant and informed.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {display.map((item, i) => (
              <Reveal key={i} direction="up">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#087F5B] hover:shadow-lg transition-all flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                    <FileText size={22} style={{ color: "#087F5B" }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Manrope" }}>{item.title}</h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "Inter" }}>{item.description}</p>
                  </div>
                  <button
                    onClick={() => item.file_url ? window.open(item.file_url, "_blank") : handleDownloadResource(item.title)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 w-fit"
                    style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    <Download size={15} /> Download
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
