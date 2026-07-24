import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, Shield, Clock, FileText, BarChart2, Users, CheckCircle,
  Globe, Star, Download, Lock, Bell, Folder,
  Calendar, PieChart, DollarSign, FileCheck,
  AlertCircle, Info, CreditCard, ClipboardList, UploadCloud, AlertTriangle,
  HelpCircle, ReceiptText, User2, LogOut, Loader2, ChevronRight, Search
} from "lucide-react";
import { Page } from "../../types/index";
import { useAuth } from "../../context";
import { resources } from "../../services";
import { api } from "../../lib/api";

// --- formatting helpers -----------------------------------------------------
const money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtSize = (b?: number | null) =>
  !b ? "" : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
const titleCase = (s?: string | null) =>
  s ? s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

// Loose row types — the backend envelope is unwrapped to plain objects.
type Row = Record<string, any>;

export function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const { session, logout } = useAuth();
  const handleLogout = async () => { await logout(); setPage("login"); };
  const [activeTab, setActiveTab] = useState("Active Services");
  const [openVaultCategory, setOpenVaultCategory] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [actionModal, setActionModal] = useState<{ title: string } | null>(null);
  const [modalForm, setModalForm] = useState({ subject: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- live data ------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Row | null>(null);
  const [services, setServices] = useState<Row[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [docRequests, setDocRequests] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [queries, setQueries] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);

  const rows = (r: PromiseSettledResult<any>): Row[] =>
    r.status === "fulfilled" ? (r.value?.data ?? r.value ?? []) : [];

  const loadQueries = useCallback(async () => {
    try { setQueries((await resources.queries.list({ page_size: 50 })).data); } catch { /* keep */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await Promise.allSettled([
      api.get<Row>("/auth/me"),
      resources.engagements.list({ page_size: 50 }),   // client_services (ClientServiceRead)
      resources.tasks.list({ page_size: 100 }),
      resources.documents.list({ page_size: 200 }),
      resources.documentRequests.list({ page_size: 50 }),
      resources.invoices.list({ page_size: 50, sort_by: "issue_date" }),
      resources.payments.list({ page_size: 50 }),
      resources.notifications.list({ page_size: 50 }),
      resources.queries.list({ page_size: 50 }),
      resources.reports.list({ page_size: 50 }),
      resources.services.list({ page_size: 100 }),      // catalogue for id → name
    ]);
    if (r[0].status === "fulfilled") setProfile(r[0].value);
    setServices(rows(r[1]));
    setTasks(rows(r[2]));
    setDocuments(rows(r[3]));
    setDocRequests(rows(r[4]));
    setInvoices(rows(r[5]));
    setPayments(rows(r[6]));
    setNotifications(rows(r[7]));
    setQueries(rows(r[8]));
    setReports(rows(r[9]));
    const catalogue = rows(r[10]);
    setServiceNames(Object.fromEntries(catalogue.map((s) => [s.id, s.name])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived views
  const pendingTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "closed");
  const upcomingDue = tasks
    .filter((t) => t.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 8);
  const vaultCategoryFiles: Record<string, Row[]> = {};
  for (const d of documents) {
    const cat = titleCase(d.file_category) || "Other";
    (vaultCategoryFiles[cat] ||= []).push(d);
  }

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || (session?.email ?? "Client")
    : (session?.email ?? "Client");
  const initials = displayName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase() || "FC";

  const handleDownloadFile = async (doc: Row) => {
    // Signed-URL download; falls back to a message if the endpoint isn't present.
    try {
      const res = await api.get<Row>(`/documents/${doc.id}/download`);
      const url = res?.url ?? res?.signed_url ?? res?.download_url;
      if (url) { window.open(url, "_blank", "noopener"); return; }
      showToast("Download link unavailable for this file.", "error");
    } catch {
      showToast("Could not fetch the download link.", "error");
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("file_category", "general");
      await api.post<Row>("/documents/upload", undefined, { form });
      await load();
      showToast(`Uploaded ${file.name}.`, "success");
    } catch {
      showToast("Upload failed. Check the file size limit and try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitQuery = async () => {
    const subject = modalForm.subject.trim();
    if (!subject) { showToast("Please add a query subject before submitting.", "error"); return; }
    if (!session?.client_id) { showToast("No client profile linked to this account.", "error"); return; }
    setSubmitting(true);
    try {
      await resources.queries.create({
        client_id: session.client_id,
        subject,
        query_text: modalForm.description.trim() || subject,
      } as Row);
      setModalForm({ subject: "", description: "" });
      setActionModal(null);
      showToast("Query submitted successfully. Our team will respond shortly.", "success");
      loadQueries();
    } catch {
      showToast("Could not submit the query. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const empty = (msg: string) => <div className="text-sm text-[#52606D] py-6 text-center">{msg}</div>;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-[#52606D] gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading your data…
        </div>
      );
    }
    switch (activeTab) {
      case "Active Services": return (
        <div className="space-y-4">
          {services.length === 0 && empty("No active services yet.")}
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><CheckCircle size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{s.service?.name ?? serviceNames[s.service_id] ?? "Service"}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>Since {fmtDate(s.start_date)}</div></div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B" }}>{titleCase(s.status)}</span>
            </div>
          ))}
        </div>
      );
      case "Pending Tasks": return (
        <div className="space-y-4">
          {pendingTasks.length === 0 && empty("No pending tasks. You're all caught up!")}
          {pendingTasks.map((t) => {
            const u = t.priority === "high" || t.priority === "urgent" ? "High" : t.priority === "medium" ? "Medium" : "Low";
            return (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: u === "High" ? "#FFF0F0" : u === "Medium" ? "#FFF4E0" : "#EAF4F0" }}><AlertCircle size={16} style={{ color: u === "High" ? "#e53e3e" : u === "Medium" ? "#C8A45D" : "#087F5B" }} /></div>
                  <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{t.title}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{t.due_date ? `Due ${fmtDate(t.due_date)}` : titleCase(t.status)}</div></div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: u === "High" ? "#FFF0F0" : u === "Medium" ? "#FFF4E0" : "#EAF4F0", color: u === "High" ? "#e53e3e" : u === "Medium" ? "#C8A45D" : "#087F5B" }}>{u}</span>
              </div>
            );
          })}
        </div>
      );
      case "Upcoming Due Dates": return (
        <div className="space-y-4">
          {upcomingDue.length === 0 && empty("No upcoming due dates.")}
          {upcomingDue.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><Calendar size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{t.title}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{titleCase(t.task_type)}</div></div>
              </div>
              <span className="text-sm font-bold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{fmtDate(t.due_date)}</span>
            </div>
          ))}
        </div>
      );
      case "Uploaded Documents": return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <label className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white cursor-pointer transition-transform active:scale-95 ${uploading ? "opacity-60 cursor-wait" : ""}`} style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} {uploading ? "Uploading…" : "Upload Document"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ""; }} />
            </label>
          </div>
          {documents.length === 0 && empty("No documents uploaded yet.")}
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><FileText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{d.name}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{fmtSize(d.file_size)} · {fmtDate(d.created_at)} · {titleCase(d.status)}</div></div>
              </div>
              <button onClick={() => handleDownloadFile(d)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EAF4F0] transition-colors" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
            </div>
          ))}
        </div>
      );
      case "Missing Documents": return (
        <div className="space-y-4">
          {docRequests.filter((r) => r.status !== "fulfilled" && r.status !== "completed").length === 0 && (
            <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl border border-[#E2E8F0]">All requested documents have been provided!</div>
          )}
          {docRequests.filter((r) => r.status !== "fulfilled" && r.status !== "completed").map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: "#FFF8F8", borderColor: "rgba(229,62,62,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF0F0" }}><AlertTriangle size={16} style={{ color: "#e53e3e" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{r.title ?? r.name ?? r.document_name ?? "Requested document"}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{r.due_date ? `Due ${fmtDate(r.due_date)}` : titleCase(r.status)}</div></div>
              </div>
              <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white cursor-pointer flex-shrink-0 ${uploading ? "opacity-60 cursor-wait" : ""}`} style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
                <UploadCloud size={13} /> Upload
                <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ""; }} />
              </label>
            </div>
          ))}
        </div>
      );
      case "Open Queries": return (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setModalForm({ subject: "", description: "" }); setActionModal({ title: "Raise New Query" }); }} className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>+ Raise Query</button>
          </div>
          <div className="space-y-4">
            {queries.length === 0 && empty("No queries raised yet.")}
            {queries.map((q) => {
              const answered = (q.responses?.length ?? 0) > 0 || q.status === "resolved" || q.status === "answered";
              const reply = q.responses?.[q.responses.length - 1]?.response_text ?? q.responses?.[q.responses.length - 1]?.body;
              return (
                <div key={q.id} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{q.subject}</div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: answered ? "#EAF4F0" : "#FFF4E0", color: answered ? "#087F5B" : "#C8A45D" }}>{answered ? "Answered" : titleCase(q.status) || "Pending"}</span>
                  </div>
                  {q.query_text && <p className="text-xs text-[#52606D] leading-relaxed mb-1" style={{ fontFamily: "Inter" }}>{q.query_text}</p>}
                  {reply && <p className="text-xs text-[#102A43] leading-relaxed" style={{ fontFamily: "Inter" }}><b>Response:</b> {reply}</p>}
                  {!answered && <p className="text-xs text-[#C8A45D] italic mt-1">Our team is reviewing this query.</p>}
                </div>
              );
            })}
          </div>
        </div>
      );
      case "Reports": return (
        <div className="space-y-4">
          {reports.length === 0 && empty("No reports available yet.")}
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><BarChart2 size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{r.title}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{titleCase(r.report_type)} · {titleCase(r.status)}{r.generated_at ? ` · ${fmtDate(r.generated_at)}` : ""}</div></div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: r.status === "completed" ? "#EAF4F0" : "#FFF4E0", color: r.status === "completed" ? "#087F5B" : "#C8A45D" }}>{titleCase(r.status)}</span>
            </div>
          ))}
        </div>
      );
      case "Invoices": return (
        <div className="space-y-4">
          {invoices.length === 0 && empty("No invoices yet.")}
          {invoices.map((inv) => {
            const paid = inv.status === "paid" || Number(inv.outstanding_amount ?? 0) <= 0;
            return (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><ReceiptText size={16} style={{ color: "#087F5B" }} /></div>
                  <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{inv.invoice_number}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>Issued {fmtDate(inv.issue_date)} · Due {fmtDate(inv.due_date)}</div></div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{money(inv.total_amount)}</div>
                  <span className="text-xs font-bold" style={{ color: paid ? "#087F5B" : "#e53e3e" }}>{paid ? "Paid" : titleCase(inv.status)}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
      case "Payments": return (
        <div className="space-y-4">
          {payments.length === 0 && empty("No payments recorded yet.")}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><CreditCard size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{p.payment_number}</div><div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{titleCase(p.payment_method)} · {fmtDate(p.payment_date)}</div></div>
              </div>
              <div className="font-bold text-[#087F5B] text-sm" style={{ fontFamily: "Manrope" }}>{money(p.amount)}</div>
            </div>
          ))}
        </div>
      );
      case "Notifications": return (
        <div className="space-y-4">
          {notifications.length === 0 && empty("No notifications.")}
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF1F5" }}>
                <Bell size={16} style={{ color: "#C8A45D" }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#102A43] text-sm mb-1" style={{ fontFamily: "Manrope" }}>{n.subject ?? "Notification"}</div>
                <p className="text-xs text-[#52606D] leading-relaxed" style={{ fontFamily: "Inter" }}>{n.body}</p>
                <div className="text-xs text-[#52606D] mt-1" style={{ fontFamily: "Inter" }}>{fmtDate(n.sent_at ?? n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      );
      case "Filing Status": return (
        <div className="space-y-4">
          {tasks.filter((t) => t.task_type === "filing" || /return|filing|itr|gst|tds/i.test(t.title ?? "")).length === 0 && empty("No filings tracked yet.")}
          {tasks.filter((t) => t.task_type === "filing" || /return|filing|itr|gst|tds/i.test(t.title ?? "")).map((t) => (
            <div key={t.id} className="p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{t.title}</div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: t.status === "completed" ? "#EAF4F0" : "#FFF4E0", color: t.status === "completed" ? "#087F5B" : "#C8A45D" }}>{titleCase(t.status)}</span>
              </div>
              <div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{t.due_date ? `Due ${fmtDate(t.due_date)}` : ""}</div>
            </div>
          ))}
        </div>
      );
      case "Document Vault": {
        const cats = Object.keys(vaultCategoryFiles).sort();
        return (
          <div>
            {cats.length === 0 && empty("Your document vault is empty.")}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {cats.map((label) => {
                const count = vaultCategoryFiles[label].length;
                const open = openVaultCategory === label;
                return (
                  <button key={label} onClick={() => setOpenVaultCategory(open ? null : label)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${open ? "border-[#087F5B] shadow-lg" : "bg-white border-[#E2E8F0] hover:border-[#087F5B]/20"}`}
                    style={open ? { background: "#F7F9FC" } : {}}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: open ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                      <Folder size={20} style={{ color: open ? "#C8A45D" : "#087F5B" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate" style={{ fontFamily: "Manrope", color: open ? "white" : "#102A43" }}>{label}</div>
                      <div className="text-xs mt-0.5" style={{ fontFamily: "Inter", color: open ? "rgba(255,255,255,0.5)" : "#52606D" }}>{count} file{count !== 1 ? "s" : ""}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: open ? "white" : "#52606D" }} className={`transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`} />
                  </button>
                );
              })}
            </div>
            {openVaultCategory && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <h4 className="font-bold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>{openVaultCategory}</h4>
                <div className="space-y-2">
                  {(vaultCategoryFiles[openVaultCategory] || []).map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0]">
                      <div className="flex items-center gap-3">
                        <FileText size={15} style={{ color: "#087F5B" }} />
                        <span className="text-sm font-medium text-[#102A43]" style={{ fontFamily: "Inter" }}>{file.name}</span>
                      </div>
                      <button onClick={() => handleDownloadFile(file)} className="flex items-center gap-1 text-xs font-semibold p-1.5 rounded hover:bg-[#EAF4F0]" style={{ color: "#087F5B" }}><Download size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "Assigned Consultant": return (
        <div className="max-w-sm">
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white mb-4" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)", fontFamily: "Manrope" }}>FC</div>
            <div className="font-bold text-[#102A43] text-xl mb-1" style={{ fontFamily: "Manrope" }}>Your Finovara Team</div>
            <div className="text-sm mb-4" style={{ color: "#087F5B", fontFamily: "Inter" }}>Relationship Manager assigned</div>
            {[{ icon: Phone, v: "+91 22 6789 0123" }, { icon: Mail, v: "hello@finovara.in" }, { icon: Clock, v: "Mon–Sat, 10am–6pm" }].map(({ icon: Icon, v }) => (
              <div key={v} className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: "#087F5B" }} />
                <span className="text-sm text-[#52606D]" style={{ fontFamily: "Inter" }}>{v}</span>
              </div>
            ))}
            <button onClick={() => { setActiveTab("Open Queries"); }} className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>Raise a Query</button>
          </div>
        </div>
      );
      case "Security": return (
        <div>
          <div className="mb-6 p-5 rounded-2xl flex items-center gap-4" style={{ background: "#F7F9FC" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.25)" }}><Shield size={24} style={{ color: "#087F5B" }} /></div>
            <div>
              <div className="font-bold text-[#102A43] text-lg" style={{ fontFamily: "Manrope" }}>Enterprise Security</div>
              <div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>Your account is protected with bank-grade, multi-layer security controls.</div>
            </div>
            <div className="ml-auto flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#EAF4F0", color: "#087F5B" }}>All Active ✓</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Shield, label: "Two-Factor Authentication", desc: "OTP for every login session.", status: "Enabled" },
              { icon: Lock, label: "Secure File Links", desc: "Time-limited, signed URLs for every document.", status: "Active" },
              { icon: Users, label: "Role-Based Access", desc: "Granular permissions per user and role.", status: "Configured" },
              { icon: FileText, label: "Audit Logs", desc: "Full activity trail for every portal action.", status: "Enabled" },
              { icon: Clock, label: "File-Version History", desc: "Restore any previous version of a file.", status: "On" },
              { icon: AlertCircle, label: "Session Timeout", desc: "Auto-logout after inactivity.", status: "30 min" },
              { icon: Globe, label: "Device-Login Tracking", desc: "Alerts and logs for every new device sign-in.", status: "Active" },
              { icon: Star, label: "Encrypted Sensitive Data", desc: "AES-256 at rest and in transit.", status: "AES-256" },
              { icon: CheckCircle, label: "Password-Reset Protection", desc: "Verified resets with anomaly detection.", status: "Protected" },
            ].map(({ icon: Icon, label, desc, status }) => (
              <div key={label} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EAF4F0" }}><Icon size={18} style={{ color: "#087F5B" }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-bold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{label}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#EAF4F0", color: "#087F5B" }}>{status}</span>
                  </div>
                  <p className="text-xs text-[#52606D] leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      default: return null;
    }
  };

  const tabs = [
    { label: "Active Services", icon: CheckCircle },
    { label: "Pending Tasks", icon: ClipboardList },
    { label: "Upcoming Due Dates", icon: Calendar },
    { label: "Document Vault", icon: Folder },
    { label: "Uploaded Documents", icon: UploadCloud },
    { label: "Missing Documents", icon: AlertTriangle },
    { label: "Assigned Consultant", icon: User2 },
    { label: "Open Queries", icon: HelpCircle },
    { label: "Filing Status", icon: FileCheck },
    { label: "Reports", icon: BarChart2 },
    { label: "Invoices", icon: ReceiptText },
    { label: "Payments", icon: CreditCard },
    { label: "Notifications", icon: Bell },
    { label: "Security", icon: Shield },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#F7F9FC" }}>
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-[#E2E8F0]" style={{ background: "#F7F9FC" }}>
            {toastMessage.type === "success" && <CheckCircle size={18} style={{ color: "#087F5B" }} />}
            {toastMessage.type === "info" && <Info size={18} style={{ color: "#3B82F6" }} />}
            {toastMessage.type === "error" && <AlertCircle size={18} style={{ color: "#e53e3e" }} />}
            <span className="text-sm font-semibold text-[#102A43]" style={{ fontFamily: "Inter" }}>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#E2E8F0] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[#102A43]">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#52606D] hover:text-[#102A43]"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-5 text-left">
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">Subject *</label>
                <input type="text" value={modalForm.subject} onChange={(e) => setModalForm((p) => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] bg-white text-[#102A43] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]" placeholder="Enter query subject…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">Description</label>
                <textarea rows={4} value={modalForm.description} onChange={(e) => setModalForm((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] bg-white text-[#102A43] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]" placeholder="Describe your query…"></textarea>
              </div>
            </div>
            <button onClick={handleSubmitQuery} disabled={submitting} className="w-full py-3 rounded-xl text-white font-semibold text-sm flex justify-center items-center gap-2 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Query"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-b bg-white z-10 relative shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div>
              <span className="font-bold text-[#102A43]" style={{ fontFamily: "Manrope" }}>Finovara</span>
              <span className="block text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>Client Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{displayName}</div>
              <div className="text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>{profile?.email ?? session?.email ?? ""}</div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{initials}</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-[#52606D] hover:text-[#e53e3e] transition-colors" style={{ fontFamily: "Inter" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col h-full pb-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-full overflow-hidden shadow-sm">
            <div className="flex-shrink-0 p-5 border-b" style={{ background: "#F7F9FC", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Open Items</div>
              <div className="text-4xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{loading ? "—" : pendingTasks.length}</div>
              <div className="text-xs text-[#52606D] mt-1" style={{ fontFamily: "Inter" }}>Pending tasks</div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {tabs.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => setActiveTab(label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${activeTab === label ? "text-white shadow-sm" : "text-[#52606D] hover:bg-[#EEF1F5] hover:text-[#102A43]"}`}
                  style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="lg:hidden w-full flex-shrink-0 flex overflow-x-auto gap-2 pb-1">
          {tabs.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${activeTab === label ? "text-white shadow-sm" : "bg-white text-[#52606D] border border-[#E2E8F0]"}`}
              style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <main className="flex-1 flex flex-col min-w-0 h-full pb-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col h-full shadow-sm overflow-hidden relative">
            <h2 className="flex-shrink-0 text-xl font-extrabold text-[#102A43] mb-6" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
            <div className="flex-1 overflow-y-auto pr-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
