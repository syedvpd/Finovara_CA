"use client";
import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, Shield, Clock, FileText, BarChart2, Users, CheckCircle,
  Globe, Star, Download, Lock, Bell, Folder, Calendar, PieChart, DollarSign,
  FileCheck, AlertCircle, Info, CreditCard, ClipboardList, UploadCloud,
  AlertTriangle, HelpCircle, ReceiptText, User2, LogOut, Loader2, ChevronRight, Search
} from "lucide-react";
import { useAuth } from "@/context";
import { resources } from "@/services";
import { api } from "@/lib/api";
import { useNavigate } from "@/hooks/useNavigate";

const money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtSize = (b?: number | null) => !b ? "" : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
const titleCase = (s?: string | null) => s ? s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
type Row = Record<string, any>;

export function DashboardPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("login"); };
  const [activeTab, setActiveTab] = useState("Active Services");
  const [openVaultCategory, setOpenVaultCategory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [actionModal, setActionModal] = useState<{ title: string } | null>(null);
  const [modalForm, setModalForm] = useState({ subject: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const rows = (r: PromiseSettledResult<any>): Row[] => r.status === "fulfilled" ? (r.value?.data ?? r.value ?? []) : [];

  const loadQueries = useCallback(async () => {
    try { setQueries((await resources.queries.list({ page_size: 50 })).data); } catch { }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await Promise.allSettled([
      api.get<Row>("/auth/me"),
      resources.engagements.list({ page_size: 50 }),
      resources.tasks.list({ page_size: 100 }),
      resources.documents.list({ page_size: 200 }),
      resources.documentRequests.list({ page_size: 50 }),
      resources.invoices.list({ page_size: 50, sort_by: "issue_date" }),
      resources.payments.list({ page_size: 50 }),
      resources.notifications.list({ page_size: 50 }),
      resources.queries.list({ page_size: 50 }),
      resources.reports.list({ page_size: 50 }),
      resources.services.list({ page_size: 100 }),
    ]);
    if (r[0].status === "fulfilled") setProfile(r[0].value);
    setServices(rows(r[1])); setTasks(rows(r[2])); setDocuments(rows(r[3]));
    setDocRequests(rows(r[4])); setInvoices(rows(r[5])); setPayments(rows(r[6]));
    setNotifications(rows(r[7])); setQueries(rows(r[8])); setReports(rows(r[9]));
    const catalogue = rows(r[10]);
    setServiceNames(Object.fromEntries(catalogue.map((s) => [s.id, s.name])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "closed");
  const upcomingDue = tasks.filter((t) => t.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 8);
  const vaultCategoryFiles: Record<string, Row[]> = {};
  for (const d of documents) { const cat = titleCase(d.file_category) || "Other"; (vaultCategoryFiles[cat] ||= []).push(d); }

  const displayName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || (session?.email ?? "Client") : (session?.email ?? "Client");
  const initials = displayName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase() || "FC";

  const handleDownloadFile = async (doc: Row) => {
    try {
      const res = await api.get<Row>(`/documents/${doc.id}/download`);
      const url = res?.url ?? res?.signed_url ?? res?.download_url;
      if (url) { window.open(url, "_blank", "noopener"); return; }
      showToast("Download link unavailable.", "error");
    } catch { showToast("Could not fetch the download link.", "error"); }
  };

  const handleSubmitQuery = async () => {
    const subject = modalForm.subject.trim();
    if (!subject) { showToast("Please add a query subject.", "error"); return; }
    if (!session?.client_id) { showToast("No client profile linked.", "error"); return; }
    setSubmitting(true);
    try {
      await resources.queries.create({ client_id: session.client_id, subject, query_text: modalForm.description.trim() || subject } as Row);
      setModalForm({ subject: "", description: "" }); setActionModal(null);
      showToast("Query submitted successfully.", "success"); loadQueries();
    } catch { showToast("Could not submit the query.", "error"); }
    finally { setSubmitting(false); }
  };

  const empty = (msg: string) => <div className="text-sm text-[#52606D] py-6 text-center">{msg}</div>;

  const tabs = [
    { label: "Active Services", icon: CheckCircle }, { label: "Pending Tasks", icon: ClipboardList },
    { label: "Upcoming Due Dates", icon: Calendar }, { label: "Document Vault", icon: Folder },
    { label: "Uploaded Documents", icon: UploadCloud }, { label: "Missing Documents", icon: AlertTriangle },
    { label: "Assigned Consultant", icon: User2 }, { label: "Open Queries", icon: HelpCircle },
    { label: "Filing Status", icon: FileCheck }, { label: "Reports", icon: BarChart2 },
    { label: "Invoices", icon: ReceiptText }, { label: "Payments", icon: CreditCard },
    { label: "Notifications", icon: Bell }, { label: "Security", icon: Shield },
  ];

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center py-16 text-[#52606D] gap-2"><Loader2 size={18} className="animate-spin" /> Loading your data…</div>;
    switch (activeTab) {
      case "Active Services": return (
        <div className="space-y-4">
          {services.length === 0 && empty("No active services yet.")}
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><CheckCircle size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{s.service?.name ?? serviceNames[s.service_id] ?? "Service"}</div><div className="text-xs text-[#52606D]">Since {fmtDate(s.start_date)}</div></div>
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
                  <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{t.title}</div><div className="text-xs text-[#52606D]">{t.due_date ? `Due ${fmtDate(t.due_date)}` : titleCase(t.status)}</div></div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: u === "High" ? "#FFF0F0" : u === "Medium" ? "#FFF4E0" : "#EAF4F0", color: u === "High" ? "#e53e3e" : u === "Medium" ? "#C8A45D" : "#087F5B" }}>{u}</span>
              </div>
            );
          })}
        </div>
      );
      case "Uploaded Documents": return (
        <div className="space-y-4">
          {documents.length === 0 && empty("No documents uploaded yet.")}
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><FileText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{d.name}</div><div className="text-xs text-[#52606D]">{fmtSize(d.file_size)} · {fmtDate(d.created_at)}</div></div>
              </div>
              <button onClick={() => handleDownloadFile(d)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EAF4F0]" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
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
                  <div><div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{inv.invoice_number}</div><div className="text-xs text-[#52606D]">Issued {fmtDate(inv.issue_date)} · Due {fmtDate(inv.due_date)}</div></div>
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
      case "Notifications": return (
        <div className="space-y-4">
          {notifications.length === 0 && empty("No notifications.")}
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF1F5" }}><Bell size={16} style={{ color: "#C8A45D" }} /></div>
              <div className="flex-1">
                <div className="font-semibold text-[#102A43] text-sm mb-1" style={{ fontFamily: "Manrope" }}>{n.subject ?? "Notification"}</div>
                <p className="text-xs text-[#52606D] leading-relaxed">{n.body}</p>
                <div className="text-xs text-[#52606D] mt-1">{fmtDate(n.sent_at ?? n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      );
      case "Open Queries": return (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setModalForm({ subject: "", description: "" }); setActionModal({ title: "Raise New Query" }); }} className="text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>+ Raise Query</button>
          </div>
          <div className="space-y-4">
            {queries.length === 0 && empty("No queries raised yet.")}
            {queries.map((q) => {
              const answered = (q.responses?.length ?? 0) > 0 || q.status === "resolved";
              return (
                <div key={q.id} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{q.subject}</div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: answered ? "#EAF4F0" : "#FFF4E0", color: answered ? "#087F5B" : "#C8A45D" }}>{answered ? "Answered" : "Pending"}</span>
                  </div>
                  {q.query_text && <p className="text-xs text-[#52606D] leading-relaxed">{q.query_text}</p>}
                </div>
              );
            })}
          </div>
        </div>
      );
      default: return empty("Select a tab to view your data.");
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#F7F9FC" }}>
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-[#E2E8F0]" style={{ background: "#F7F9FC" }}>
            {toastMessage.type === "success" && <CheckCircle size={18} style={{ color: "#087F5B" }} />}
            {toastMessage.type === "info" && <Info size={18} style={{ color: "#3B82F6" }} />}
            {toastMessage.type === "error" && <AlertCircle size={18} style={{ color: "#e53e3e" }} />}
            <span className="text-sm font-semibold text-[#102A43]">{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#E2E8F0]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[#102A43]">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#52606D] hover:text-[#102A43]"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">Subject *</label>
                <input type="text" value={modalForm.subject} onChange={(e) => setModalForm(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] bg-white text-[#102A43] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]" placeholder="Enter query subject…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#102A43] mb-1">Description</label>
                <textarea rows={4} value={modalForm.description} onChange={(e) => setModalForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] bg-white text-[#102A43] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]" placeholder="Describe your query…" />
              </div>
            </div>
            <button onClick={handleSubmitQuery} disabled={submitting} className="w-full py-3 rounded-xl text-white font-semibold text-sm flex justify-center items-center gap-2 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Query"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-b bg-white z-10 shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div>
              <span className="font-bold text-[#102A43]" style={{ fontFamily: "Manrope" }}>Finovara</span>
              <span className="block text-xs text-[#52606D]">Client Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{displayName}</div>
              <div className="text-xs text-[#52606D]">{session?.email ?? ""}</div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{initials}</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-[#52606D] hover:text-[#e53e3e] transition-colors">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col h-full pb-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-full overflow-hidden shadow-sm">
            <div className="flex-shrink-0 p-5 border-b" style={{ background: "#F7F9FC" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C8A45D" }}>Open Items</div>
              <div className="text-4xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{loading ? "—" : pendingTasks.length}</div>
              <div className="text-xs text-[#52606D] mt-1">Pending tasks</div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {tabs.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => setActiveTab(label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${activeTab === label ? "text-white shadow-sm" : "text-[#52606D] hover:bg-[#EEF1F5] hover:text-[#102A43]"}`}
                  style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)" } : {}}>
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
              style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)" } : {}}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <main className="flex-1 flex flex-col min-w-0 h-full pb-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col h-full shadow-sm overflow-hidden">
            <h2 className="flex-shrink-0 text-xl font-extrabold text-[#102A43] mb-6" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
            <div className="flex-1 overflow-y-auto pr-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
