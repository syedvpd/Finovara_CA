import { useState, useEffect, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  Menu, X, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Mail,
  MapPin, Shield, Clock, FileText, BarChart2, Users, Briefcase, CheckCircle,
  Building2, Globe, Star, Quote, Download, Send, Lock, Bell, Folder,
  TrendingUp, Award, Zap, Calendar, MessageCircle, ExternalLink, Play,
  BookOpen, Search, Filter, Heart, Linkedin, Twitter, Instagram, Youtube,
  Facebook, ChevronLeft, PieChart as PieChartIcon, DollarSign, FileCheck, UserCheck,
  AlertCircle, Info, ArrowUpRight, Target, Layers, Cpu, Lightbulb, Flag, Plus,
  CreditCard, ClipboardList, UploadCloud, AlertTriangle, HelpCircle, Settings,
  ReceiptText, User2, LogOut, List, Eye, RotateCcw, CalendarDays
} from "lucide-react";
import { Page } from "../../types/index";
import { useAuth } from "../../context";
import { resources, requestPasswordReset } from "../../services";
import { api, ApiError } from "../../lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, LabelList } from "recharts";
const _PieChartIcon = PieChartIcon;

// Chart palette — validated for CVD separation; status hues carry meaning
// (paid=emerald, pending=amber, overdue=red) and always ship with labels.
const CHART = { emerald: "#0CA678", amber: "#E8952A", red: "#E5484D", blue: "#4C8DF5", slate: "#64748B" };
// Mirrors backend DOCUMENT_CATEGORIES — a category label outside this list (e.g. "Other") falls back to "general".
const DOC_CATEGORIES = ["tax", "gst", "audit", "payroll", "report", "invoice", "kyc", "general"];
// Every other staff role only has read access to /clients (see permissions.py _STAFF_BASE) — showing
// Add/Edit/Delete for them just leads to a 403. Client Management stays visible for context (e.g. an
// accountant picking a client to invoice); only these roles can actually create/edit/delete one.
const CAN_MANAGE_CLIENTS = ["Super Admin", "Managing Partner", "Relationship Manager"];
const _num = (v: unknown) => Number(v ?? 0) || 0;

// Formatting + safe backend→UI mapping helpers for the admin lists.
const _money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const _date = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
const _tc = (s?: string | null) => s ? s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
const _rowsOf = (r: PromiseSettledResult<any>): any[] => r.status === "fulfilled" ? (r.value?.data ?? r.value ?? []) : [];

type ActionModalState = { title: string; type: 'form'|'upload'; section?: string; item?: any };

export function AdminDashboardPage({ setPage, userRole }: { setPage: (p: Page) => void, userRole: string }) {
  const { logout, session } = useAuth();
  const handleLogout = async () => { await logout(); setPage("login"); };
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'info'|'error'} | null>(null);
  // The Save button fires one of ~30 handlers that don't return their promise
  // (persist() runs fire-and-forget), so it can't be disabled via a simple
  // await. Every one of them ends in a toast (success or error) — reset the
  // guard on that signal instead, and again whenever a fresh modal opens.
  const [modalSaving, setModalSaving] = useState(false);
  useEffect(() => { setModalSaving(false); }, [toastMessage, actionModal]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [blogForm, setBlogForm] = useState({ title: "", content: "", summary: "", metaTitle: "", metaDesc: "", status: "draft", publishAt: "" });
  const [careerForm, setCareerForm] = useState({ job_title: "", department: "", location: "", description: "", requirements: "", status: "open" });
  const [invoiceForm, setInvoiceForm] = useState({ clientId: "", due: "", description: "", amount: "" });
  const [queryForm, setQueryForm] = useState({ clientId: "", subject: "", description: "" });
  const [payrollForm, setPayrollForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [ledgerForm, setLedgerForm] = useState({ code: "", name: "", type: "asset" });
  const [voucherForm, setVoucherForm] = useState({ date: "", description: "", debit_account: "", credit_account: "", amount: "", clientId: "" });
  const [attendanceForm, setAttendanceForm] = useState({ employee_id: "", period_month: String(new Date().getMonth()+1), period_year: String(new Date().getFullYear()), days_present: "22", total_days: "30" });
  const [meetingForm, setMeetingForm] = useState({ lead_id: "", scheduled_date: "", notes: "" });
  const [settings, setSettings] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [auditForm, setAuditForm] = useState({ clientId: "", serviceId: "", start: "", end: "", type: "statutory", risk: "medium" });
  const [taxForm, setTaxForm] = useState({ income: "", liability: "", refund: "", refundStatus: "pending" });
  const [lateFee, setLateFee] = useState({ days: "0", nil: "no" });
  const [checklistForm, setChecklistForm] = useState({ auditId: "", item: "", desc: "" });
  const [obsForm, setObsForm] = useState({ auditId: "", title: "", desc: "", risk: "medium" });
  const [bankForm, setBankForm] = useState({ clientId: "", csv: "" });
  const [reminderForm, setReminderForm] = useState({ subject: "", body: "", when: "" });
  const [payrollProfiles, setPayrollProfiles] = useState<any[]>([]);
  const [salaryForm, setSalaryForm] = useState({ salary: "" });
  const [staffCsv, setStaffCsv] = useState({ clientId: "", csv: "" });
  const [chatForm, setChatForm] = useState({ clientId: "", text: "" });
  const [tbClientId, setTbClientId] = useState("");
  const [formValues, setFormValues] = useState({
    clientName: "",
    caName: "",
    email: "",
    pan: "",
    gstin: "",
    services: "3",
    status: "Active" as 'Active' | 'Inactive',
  });
  const [serviceFormValues, setServiceFormValues] = useState({
    svc: "",
    cat: "",
    price: "",
    clients: "10",
    active: true,
  });
  const [employeeFormValues, setEmployeeFormValues] = useState({
    name: "",
    role: "Staff",
    dept: "",
    email: "",
    clients: "2",
    tasks: "1",
  });
  const [taskFormValues, setTaskFormValues] = useState({
    task: "",
    client: "",
    clientId: "",
    taskType: "general",
    assignee: "",
    due: "",
    priority: "Medium",
    status: "todo",
  });
  const [leadFormValues, setLeadFormValues] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    source: "Website",
    service: "",
    status: "new" as string,
    followUp: "Today",
  });
  const [formErrors, setFormErrors] = useState<{ pan?: string; gstin?: string }>({});
  const [reviewDocs, setReviewDocs] = useState<any[]>([]);
  const [dueTasks, setDueTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [careersList, setCareersList] = useState<any[]>([]);
  const [taxReturns, setTaxReturns] = useState<any[]>([]);
  const [gstReturns, setGstReturns] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [docStats, setDocStats] = useState<{ total: number; pending: number; storage: string; cats: any[] }>({ total: 0, pending: 0, storage: "0 B", cats: [] });
  const [docUploadForm, setDocUploadForm] = useState<{ clientId: string; category: string; file: File | null }>({ clientId: "", category: "general", file: null });
  const [queries, setQueries] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load real data and map backend rows into the compact shapes the tabs render.
  const loadData = useCallback(async () => {
      setDataLoading(true);
      const r = await Promise.allSettled([
        resources.clients.list({ page_size: 100 }),
        resources.services.list({ page_size: 100 }),
        resources.employees.list({ page_size: 100 }),
        resources.tasks.list({ page_size: 100 }),
        resources.leads.list({ page_size: 100 }),
        resources.documents.list({ page_size: 100 }),
        resources.notifications.list({ page_size: 50 }),
        resources.invoices.list({ page_size: 100 }),
        resources.payments.list({ page_size: 100 }),
        resources.blogs.list({ page_size: 100 }),
        resources.careers.list({ page_size: 100 }),
        resources.taxReturns.list({ page_size: 100 }),
        resources.gstReturns.list({ page_size: 100 }),
        resources.audits.list({ page_size: 100 }),
        resources.complianceCalendar.list({ page_size: 100 }),
        resources.queries.list({ page_size: 100 }),
        resources.engagements.list({ page_size: 100 }),
        resources.contactRequests.list({ page_size: 100 }),
        resources.payrollRuns.list({ page_size: 100 }),
        resources.ledgerAccounts.list({ page_size: 100 }),
        resources.vouchers.list({ page_size: 100 }),
        resources.payrollProfiles.list({ page_size: 100 }),
      ]);

      setClients(_rowsOf(r[0]).map((c: any) => {
        const e = c.entities?.[0] ?? {};
        return { n: e.legal_name ?? e.trade_name ?? c.client_code, ca: c.client_type ? _tc(c.client_type) : "—",
          pan: e.pan ?? "—", gstin: e.gst_number ?? "—", svc: c.entities?.length ?? 0,
          status: c.status === "active" ? "Active" : "Inactive", entityId: e.id, _raw: c };
      }));
      setServices(_rowsOf(r[1]).map((s: any) => ({ svc: s.name, cat: _tc(s.department), price: _money(s.base_price), clients: 0, active: true, _raw: s })));
      setEmployees(_rowsOf(r[2]).map((e: any) => ({
        n: e.user ? `${e.user.first_name ?? ""} ${e.user.last_name ?? ""}`.trim() || e.employee_code : e.employee_code,
        role: e.designation, dept: e.department, clients: 0, tasks: 0, email: e.user?.email ?? "—", _raw: e })));
      setTasks(_rowsOf(r[3]).map((t: any) => ({ task: t.title, client: t.client_id?.slice(0, 8) ?? "—", assignee: t.assignments?.[0]?.assignee_name ?? "—",
        due: _date(t.due_date), priority: _tc(t.priority), status: _tc(t.status), _raw: t })));
      setLeads(_rowsOf(r[4]).map((l: any) => ({ name: l.company_name ?? l.name, contact: l.name, source: _tc(l.source),
        service: "—", status: l.status, followUp: "—", _raw: l })));
      const allDocs = _rowsOf(r[5]);
      const pendingDocs = allDocs.filter((d: any) => _lc(d.status) === "pending");
      setReviewDocs(pendingDocs.map((d: any) => ({ id: d.id, doc: d.name, client: d.client_id?.slice(0, 8) ?? "—", uploaded: _date(d.created_at), reviewer: _tc(d.status) })));
      const fmtBytes = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} KB` : `${n} B`;
      const catMap: Record<string, { count: number; size: number; last: string }> = {};
      for (const d of allDocs) {
        const k = _tc(d.file_category) || "Other";
        (catMap[k] ||= { count: 0, size: 0, last: d.created_at });
        catMap[k].count += 1; catMap[k].size += _num(d.file_size);
        if (String(d.created_at) > String(catMap[k].last)) catMap[k].last = d.created_at;
      }
      setDocStats({
        total: allDocs.length, pending: pendingDocs.length,
        storage: fmtBytes(allDocs.reduce((s: number, d: any) => s + _num(d.file_size), 0)),
        cats: Object.entries(catMap).map(([cat, v]) => ({ cat, count: `${v.count} files`, size: fmtBytes(v.size), lastUp: _date(v.last) })),
      });
      setNotifications(_rowsOf(r[6]).map((n: any) => ({ title: n.subject ?? "Notification", msg: n.body, t: _date(n.sent_at ?? n.created_at), type: "info" })));
      setInvoices(_rowsOf(r[7]).map((i: any) => ({
        inv: i.invoice_number, client: i.client_id?.slice(0, 8) ?? "—", svc: _tc(i.status),
        amt: _money(i.total_amount), date: _date(i.issue_date),
        status: i.status === "paid" ? "Paid" : (Number(i.paid_amount) < Number(i.total_amount) && new Date(i.due_date) < new Date() ? "Overdue" : _tc(i.status)),
        _raw: i })));
      setPayments(_rowsOf(r[8]).map((p: any) => ({
        ref: p.payment_number, client: p.client_id?.slice(0, 8) ?? "—", inv: p.invoice_id?.slice(0, 8) ?? "—",
        amt: _money(p.amount), method: _tc(p.payment_method), date: _date(p.payment_date),
        status: p.status === "completed" || p.status === "received" ? "Received" : _tc(p.status), _raw: p })));
      setBlogs(_rowsOf(r[9]).map((b: any) => ({
        title: b.title, cat: "Blog", author: b.author_id?.slice(0, 8) ?? "—", date: _date(b.published_at),
        status: _tc(b.status), views: "—", _raw: b })));
      setCareersList(_rowsOf(r[10]).map((c: any) => ({
        role: c.job_title, type: _tc(c.department), loc: c.location, apps: 0,
        status: c.status === "open" || c.status === "active" ? "Active" : "Closed", _raw: c })));
      setTaxReturns(_rowsOf(r[11]).map((t: any) => ({
        client: t.client_id?.slice(0, 8) ?? "—", itr: t.return_type, fy: t.financial_year,
        status: _tc(t.status), ack: t.acknowledgement_url ? "Filed" : "—", date: t.assessment_year, _raw: t })));
      setGstReturns(_rowsOf(r[12]).map((g: any) => ({
        client: g.client_id?.slice(0, 8) ?? "—", form: g.return_type,
        period: `${g.period_month ?? ""}/${g.period_year}`, status: _tc(g.status),
        arno: g.filed_at ? "Filed" : "—", _raw: g })));
      setQueries(_rowsOf(r[15]).map((q: any) => ({
        q: q.subject ?? q.title ?? "Query", client: q.client_id?.slice(0, 8) ?? "—",
        age: q.created_at ? (() => { const d = Math.floor((Date.now() - new Date(q.created_at).getTime()) / 36e5); return d < 24 ? `${d} hr` : `${Math.floor(d/24)} day`; })() : "—",
        staff: q.assigned_to?.slice(0, 8) ?? "—", priority: _tc(q.priority ?? "medium"), _raw: q })));
      setEngagements(_rowsOf(r[16]));
      setContactRequests(_rowsOf(r[17]).map((c: any) => ({
        name: c.name, email: c.email, phone: c.phone ?? "—",
        service: c.subject ?? "—", msg: c.message ?? "",
        date: _date(c.created_at), status: c.status ?? "new", _raw: c,
      })));
      setAudits(_rowsOf(r[13]).map((a: any) => ({
        client: a.client_id?.slice(0, 8) ?? "—", type: _tc(a.audit_type), stage: _tc(a.status),
        stageNum: 3, lead: "—", team: [], due: _date(a.end_date), _raw: a })));
      setCompliance(_rowsOf(r[14]).map((c: any) => {
        const due = c.due_date ? new Date(c.due_date) : null;
        const days = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : 99;
        const urgency = _lc(c.status) === "filed" ? "low" : days < 0 ? "critical" : days <= 2 ? "high" : days <= 7 ? "medium" : "low";
        return { date: _date(c.due_date), filing: c.compliance_type?.name ?? _tc(c.status), clients: c.client_id?.slice(0, 8) ?? "—", owner: "—", status: _tc(c.status), urgency };
      }));
      const soon = _rowsOf(r[3]).filter((t: any) => t.due_date).sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 8);
      setDueTasks(soon.map((t: any) => ({ id: t.id, task: t.title, date: _date(t.due_date), staff: t.assignments?.[0]?.assignee_name ?? "—", status: t.status })));
      setPayrollRuns(_rowsOf(r[18]).map((p: any) => ({
        period: `${p.period_month}/${p.period_year}`, status: _tc(p.status),
        gross: _money(p.total_gross ?? p.gross_amount ?? 0), net: _money(p.total_net ?? p.net_amount ?? 0), _raw: p })));
      setLedgerAccounts(_rowsOf(r[19]).map((a: any) => ({
        code: a.account_code, name: a.account_name, type: _tc(a.account_type), balance: _money(a.current_balance ?? a.opening_balance ?? 0), _raw: a })));
      setVouchers(_rowsOf(r[20]).map((v: any) => ({
        no: v.voucher_number ?? v.id?.slice(0, 8), type: _tc(v.voucher_type), date: _date(v.voucher_date ?? v.created_at), amount: _money(v.total_amount ?? 0), status: _tc(v.status), _raw: v })));
      setPayrollProfiles(_rowsOf(r[21]).map((p: any) => ({
        name: p.employee_name, code: p.employee_code, salary: _money(p.base_salary), _raw: p })));
      setDataLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Write-through helper: run a server mutation, then refresh the lists.
  const persist = async (fn: () => Promise<any>, okMsg: string) => {
    try {
      await fn();
      await loadData();
      setActionModal(null);
      showToast(okMsg, "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Server rejected the change. Please check the fields and try again.", "error");
    }
  };
  const _slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "svc";
  const _lc = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "_");
  const showToast = (msg: string, type: 'success'|'info'|'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openEditClient = (client: { n: string; ca: string; pan: string; gstin: string; svc: number; status: 'Active' | 'Inactive'; entityId?: string; _raw?: any }) => {
    setFormValues({
      clientName: client.n,
      caName: client.ca,
      pan: client.pan === "—" ? "" : client.pan,
      gstin: client.gstin === "—" ? "" : client.gstin,
      services: String(client.svc),
      status: client.status,
    });
    setFormErrors({});
    setActionModal({ title: 'Edit Client', type: 'form', section: 'client', item: client });
  };

  const openDeleteClient = (client: { n: string; ca: string; pan: string; gstin: string; svc: number; status: 'Active' | 'Inactive'; _raw?: any }) => {
    setActionModal({ title: 'Delete Client', type: 'form', section: 'client', item: client });
  };

  const openEditEmployee = (employee: { n: string; role: string; dept: string; clients: number; tasks: number; email: string }) => {
    setEmployeeFormValues({
      name: employee.n,
      role: employee.role,
      dept: employee.dept,
      email: employee.email,
      clients: String(employee.clients),
      tasks: String(employee.tasks),
    });
    setActionModal({ title: 'Edit Employee', type: 'form', section: 'employee', item: employee });
  };

  const openDeleteEmployee = (employee: { n: string; role: string; dept: string; clients: number; tasks: number; email: string }) => {
    setActionModal({ title: 'Delete Employee', type: 'form', section: 'employee', item: employee });
  };

  const openEditService = (service: { svc: string; cat: string; price: string; clients: number; active: boolean; _raw?: any }) => {
    setServiceFormValues({
      svc: service.svc,
      cat: service.cat,
      price: service.price,
      clients: String(service.clients),
      active: service.active,
    });
    setActionModal({ title: 'Edit Service', type: 'form', section: 'service', item: service });
  };

  const openDeleteService = (service: { svc: string; cat: string; price: string; clients: number; active: boolean; _raw?: any }) => {
    setActionModal({ title: 'Delete Service', type: 'form', section: 'service', item: service });
  };

  const openEditTask = (taskItem: any) => {
    const r = taskItem._raw ?? {};
    setTaskFormValues({
      task: r.title ?? taskItem.task ?? "",
      client: taskItem.client ?? "",
      clientId: r.client_id ?? "",
      taskType: r.task_type ?? "general",
      assignee: taskItem.assignee ?? "",
      due: r.due_date ? String(r.due_date).slice(0, 10) : "",
      priority: _tc(r.priority ?? taskItem.priority ?? "medium"),
      status: _tc(r.status ?? taskItem.status ?? "todo"),
    });
    setActionModal({ title: 'Edit Task', type: 'form', section: 'task', item: taskItem });
  };

  const openDeleteTask = (taskItem: { task: string; client: string; assignee: string; due: string; priority: string; status: string }) => {
    setActionModal({ title: 'Delete Task', type: 'form', section: 'task', item: taskItem });
  };

  const handleReviewDecision = async (item: any, decision: 'approve'|'reject') => {
    // Dedicated endpoint; DOCUMENT_STATUSES only allows verified|rejected here.
    const status = decision === 'approve' ? 'verified' : 'rejected';
    if (item.id) {
      try { await api.post(`/documents/${item.id}/verify`, { status }); }
      catch (err) { showToast(err instanceof ApiError ? err.message : 'Could not update the document.', 'error'); return; }
    }
    setReviewDocs(prev => prev.filter(d => d.doc !== item.doc));
    showToast(`${decision === 'approve' ? 'Approved' : 'Rejected'} ${item.doc}`, decision === 'approve' ? 'success' : 'error');
  };

  const handleMarkTaskDone = async (item: any) => {
    if (item.id) {
      try {
        // "backlog" can only move to "todo" directly; every other status can jump straight to "done".
        if (_lc(item.status) === 'backlog') await resources.tasks.update(item.id, { status: 'todo' } as any);
        await resources.tasks.update(item.id, { status: 'done' } as any);
      }
      catch (e) { showToast(e instanceof ApiError ? e.message : 'Could not update the task on the server.', 'error'); return; }
    }
    setDueTasks(prev => prev.filter(t => t.task !== item.task));
    showToast(`Task marked done: ${item.task}`, 'success');
  };

  const handleAddClient = async () => {
    const name = formValues.clientName.trim();
    const email = formValues.email.trim().toLowerCase();
    if (!name) { showToast('Please enter a client name.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid login email for the client.', 'error'); return; }

    // Optional format check — PAN/GSTIN are stored on the entity, not required to onboard.
    const pan = formValues.pan.trim().toUpperCase();
    if (pan && !/^[A-Z]{5}\d{5}$/.test(pan.slice(0, 10))) { /* lenient: ignore */ }

    try {
      await api.post("/onboarding/clients", {
        full_name: name, email, company_name: name, client_type: "private_limited",
      });
      try { await requestPasswordReset(email); } catch { /* email best-effort: Supabase rate-limits; account is already created, user can use OTP */ }   // client sets their own password via email
      setFormValues({ clientName: "", caName: "", email: "", pan: "", gstin: "", services: "3", status: "Active" });
      setFormErrors({});
      setActionModal(null);
      await loadData();
      showToast(`Client created for ${email}. They can set a password via the email link or sign in with OTP.`, 'success');
    } catch {
      showToast('Could not create the client on the server. Check the email and try again.', 'error');
    }
  };

  const handleAddEmployee = async () => {
    const name = employeeFormValues.name.trim();
    const email = employeeFormValues.email.trim().toLowerCase();
    if (!name) { showToast('Please enter an employee name.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid login email for the employee.', 'error'); return; }

    try {
      await api.post("/onboarding/employees", {
        full_name: name,
        email,
        designation: employeeFormValues.role || "Staff",
        department: employeeFormValues.dept.trim() || "Operations",
        role_code: "accountant",
      });
      try { await requestPasswordReset(email); } catch { /* email best-effort: Supabase rate-limits; account is already created, user can use OTP */ }
      setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" });
      setActionModal(null);
      await loadData();
      showToast(`Employee created for ${email}. They can set a password via the email link or sign in with OTP.`, 'success');
    } catch {
      showToast('Could not create the employee on the server. Check the email and try again.', 'error');
    }
  };

  const handleAddService = () => {
    const name = serviceFormValues.svc.trim();
    if (!name) {
      showToast('Please enter a service name.', 'error');
      return;
    }

    const department = (serviceFormValues.cat.trim() || 'General').slice(0, 50);
    const price = Number((serviceFormValues.price || "").replace(/[^0-9.]/g, "")) || 0;
    setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true });
    persist(() => resources.services.create({
      name, code: _slug(name), department, base_price: String(price), billing_cycle: "monthly",
    } as any), 'Service added successfully.');
  };

  const handleUpdateClient = () => {
    const name = formValues.clientName.trim();
    if (!name) {
      showToast('Please enter a client name.', 'error');
      return;
    }

    const pan = formValues.pan.trim().toUpperCase();
    const gstin = formValues.gstin.trim().toUpperCase();
    // Real Indian formats. PAN: 5 letters + 4 digits + 1 letter (e.g. ILGPM8672B).
    // GSTIN: 2-digit state + 10-char PAN + entity + Z + checksum (e.g. 22ABCDE1234F1Z5).
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
    const nextErrors: { pan?: string; gstin?: string } = {};

    // PAN/GSTIN are optional; only validate the format when a value is entered.
    if (pan && !panRegex.test(pan)) {
      nextErrors.pan = 'Enter a valid PAN, e.g. ABCDE1234F (5 letters, 4 digits, 1 letter).';
    }

    if (gstin && !gstinRegex.test(gstin)) {
      nextErrors.gstin = 'Enter a valid 15-character GSTIN, e.g. 22ABCDE1234F1Z5.';
    }

    if (nextErrors.pan || nextErrors.gstin) {
      setFormErrors(nextErrors);
      showToast('Please correct the PAN or GSTIN format.', 'error');
      return;
    }

    const id = actionModal?.item?._raw?.id;
    const entityId = actionModal?.item?.entityId;
    const newStatus = formValues.status === 'Active' ? 'active' : 'inactive';
    setFormValues({ clientName: "", caName: "", email: "", pan: "", gstin: "", services: "3", status: "Active" });
    setFormErrors({});
    if (!id) { setActionModal(null); return; }
    persist(async () => {
      await resources.clients.update(id, { status: newStatus });
      if (entityId) await resources.clientEntities.update(entityId, { pan: pan || undefined, gst_number: gstin || undefined } as any);
    }, 'Client updated successfully.');
  };

  const handleDeleteClient = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.clients.remove(id), 'Client deleted successfully.');
  };

  const handleUpdateEmployee = () => {
    const name = employeeFormValues.name.trim();
    if (!name) {
      showToast('Please enter an employee name.', 'error');
      return;
    }

    const email = employeeFormValues.email.trim();
    if (!email) {
      showToast('Please enter an email address.', 'error');
      return;
    }

    const id = actionModal?.item?._raw?.id;
    const designation = employeeFormValues.role || 'Staff';
    const department = employeeFormValues.dept.trim() || 'General';
    setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" });
    if (!id) { setActionModal(null); return; }
    persist(() => resources.employees.update(id, { designation, department }), 'Employee updated successfully.');
  };

  const handleDeleteEmployee = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.employees.remove(id), 'Employee deleted successfully.');
  };

  const handleUpdateService = () => {
    const name = serviceFormValues.svc.trim();
    if (!name) {
      showToast('Please enter a service name.', 'error');
      return;
    }

    const id = actionModal?.item?._raw?.id;
    const department = (serviceFormValues.cat.trim() || 'General').slice(0, 50);
    setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true });
    if (!id) { setActionModal(null); return; }
    persist(() => resources.services.update(id, { name, department }), 'Service updated successfully.');
  };

  const handleDeleteService = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.services.remove(id), 'Service deleted successfully.');
  };

  const handleUpdateTask = () => {
    const taskTitle = taskFormValues.task.trim();
    if (!taskTitle) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    const id = actionModal?.item?._raw?.id;
    const priority = _lc(taskFormValues.priority);   // low|medium|high|urgent
    const status = _lc(taskFormValues.status);       // TASK_STATUSES: backlog|todo|in_progress|review|partner_approval|client_approval|done
    setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "todo" });
    if (!id) { setActionModal(null); return; }
    persist(() => resources.tasks.update(id, { title: taskTitle, priority, status, due_date: taskFormValues.due || undefined } as any), 'Task updated successfully.');
  };

  const handleDeleteTask = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.tasks.remove(id), 'Task deleted successfully.');
  };

  const handleDownloadReport = (reportName: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    doc.setFillColor(8, 127, 91);
    doc.rect(0, 0, pageWidth, 110, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Finovara Advisory Report", margin, 44);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Professional reporting made elegant and actionable", margin, 68);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 90);

    doc.setTextColor(16, 42, 67);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(reportName, margin, 140);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("This report summarizes the current operational snapshot of the firm with key metrics and progress highlights.", margin, 162, { maxWidth: pageWidth - margin * 2 });

    doc.setDrawColor(8, 127, 91);
    doc.setLineWidth(1);
    doc.line(margin, 180, pageWidth - margin, 180);

    const metrics = [
      { label: "Clients", value: "5" },
      { label: "Active Services", value: "8" },
      { label: "Open Tasks", value: "5" },
      { label: "Outstanding Invoices", value: "3" },
      { label: "Compliance Health", value: "Healthy" },
    ];

    metrics.forEach((metric, index) => {
      const x = margin + index * 95;
      doc.setFillColor(247, 249, 252);
      doc.roundedRect(x, 195, 80, 52, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(8, 127, 91);
      doc.text(metric.value, x + 40, 220, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(82, 96, 109);
      doc.text(metric.label, x + 40, 240, { align: "center" });
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 42, 67);
    doc.text("Highlights", margin, 280);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const highlights = [
      "• Client onboarding remains on track with strong service utilization.",
      "• Compliance work is progressing smoothly with no critical blockers.",
      "• Staff workload is balanced, and pending tasks are being prioritized.",
      "• Financial tracking reflects healthy receivables and stable operations.",
    ];
    highlights.forEach((line, index) => {
      doc.text(line, margin + 10, 300 + index * 16);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Recommended Next Steps", margin, 360);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const nextSteps = [
      "1. Review outstanding invoices and follow up with clients this week.",
      "2. Finalize the next compliance checklist for the pending filings.",
      "3. Share the report with the leadership team for monthly review.",
    ];
    nextSteps.forEach((line, index) => {
      doc.text(line, margin + 10, 382 + index * 16);
    });

    const imageUrl = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80";
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const imgWidth = 120;
      const imgHeight = 80;
      const x = pageWidth - margin - imgWidth;
      const y = 12;
      doc.addImage(image, "JPEG", x, y, imgWidth, imgHeight);
      doc.save(`${reportName.replace(/\s+/g, "_")}.pdf`);
      showToast(`Downloaded ${reportName} as PDF`, "success");
    };
    image.onerror = () => {
      doc.save(`${reportName.replace(/\s+/g, "_")}.pdf`);
      showToast(`Downloaded ${reportName} as PDF`, "success");
    };
    image.src = imageUrl;
  };

  const handleAddTask = () => {
    const taskTitle = taskFormValues.task.trim();
    if (!taskTitle) { showToast('Please enter a task title.', 'error'); return; }
    const picked = clients.find((c) => c._raw?.id === taskFormValues.clientId);
    if (!picked) { showToast('Please select a client for this task.', 'error'); return; }
    const body: any = {
      title: taskTitle,
      task_type: taskFormValues.taskType,
      priority: _lc(taskFormValues.priority),
      client_id: picked._raw.id,
      branch_id: picked._raw.branch_id,
    };
    if (taskFormValues.due) body.due_date = taskFormValues.due;
    setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "todo" });
    persist(() => resources.tasks.create(body), 'Task created successfully.');
  };

  const handleAddLead = () => {
    const company = leadFormValues.name.trim();
    const contact = leadFormValues.contact.trim();
    const email = leadFormValues.email.trim().toLowerCase();
    const phone = leadFormValues.phone.replace(/[\s-]/g, "");
    if (!company) { showToast('Please enter the lead / company name.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email for the lead.', 'error'); return; }
    if (!/^\+?[0-9]{7,15}$/.test(phone)) { showToast('Please enter a valid phone number for the lead.', 'error'); return; }
    const body: any = {
      name: contact || company,
      email,
      phone,
      company_name: company,
      source: _lc(leadFormValues.source),
      notes: leadFormValues.service.trim() || undefined,
    };
    setLeadFormValues({ name: "", contact: "", email: "", phone: "", source: "Website", service: "", status: "new", followUp: "Today" });
    persist(() => resources.leads.create(body), 'Lead added successfully.');
  };

  const openEditLead = (item: any) => {
    const l = item._raw ?? {};
    setLeadFormValues({ name: l.company_name ?? l.name ?? "", contact: l.name ?? "", email: l.email ?? "", phone: l.phone ?? "", source: _tc(l.source) || "Website", service: l.notes ?? "", status: (l.status ?? "new"), followUp: "Today" });
    setActionModal({ title: 'Edit Lead', type: 'form', section: 'lead', item });
  };

  const handleUpdateLead = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.leads.update(id, { company_name: leadFormValues.name.trim(), status: leadFormValues.status, notes: leadFormValues.service.trim() || undefined } as any), 'Lead updated successfully.');
  };

  const handleConvertLead = async (item: any) => {
    const l = item?._raw ?? {};
    const email = (l.email ?? "").trim().toLowerCase();
    const name = l.company_name ?? l.name ?? "Client";
    if (!email) { showToast('Lead has no email to convert.', 'error'); return; }
    try {
      await api.post("/onboarding/clients", { full_name: name, email, company_name: name, client_type: "private_limited" });
      try { await requestPasswordReset(email); } catch { /* email best-effort */ }
      if (l.id) {
        // "won" is only reachable via new -> contacted -> proposal_sent -> onboarding -> won; walk the chain.
        const LEAD_PATH = ["new", "contacted", "proposal_sent", "onboarding", "won"];
        const startIdx = Math.max(LEAD_PATH.indexOf(_lc(l.status)), 0);
        for (const next of LEAD_PATH.slice(startIdx + 1)) {
          await resources.leads.update(l.id, { status: next } as any);
        }
      }
      await loadData();
      showToast(`Converted — client account created for ${email}.`, 'success');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not convert lead. The email may already have an account.', 'error');
    }
  };

  const openEditBlog = (item: any) => { const b = item._raw ?? {}; setBlogForm({ title: b.title ?? "", content: b.content ?? "", summary: b.summary ?? "", metaTitle: b.meta_title ?? "", metaDesc: b.meta_description ?? "", status: _lc(b.status ?? "draft"), publishAt: b.published_at ? String(b.published_at).slice(0, 16) : "" }); setActionModal({ title: 'Edit Blog', type: 'form', item }); };
  const handleAddBlog = () => {
    const title = blogForm.title.trim(), content = blogForm.content.trim();
    if (!title || !content) { showToast('Title and content are required.', 'error'); return; }
    persist(() => resources.blogs.create({ title, content, summary: blogForm.summary.trim() || undefined,
      meta_title: blogForm.metaTitle.trim() || undefined, meta_description: blogForm.metaDesc.trim() || undefined } as any), 'Post created.');
  };
  const handleUpdateBlog = () => {
    const id = actionModal?.item?._raw?.id; if (!id) { setActionModal(null); return; }
    const body: any = { title: blogForm.title.trim(), content: blogForm.content.trim() || undefined,
      summary: blogForm.summary.trim() || undefined, meta_title: blogForm.metaTitle.trim() || undefined,
      meta_description: blogForm.metaDesc.trim() || undefined, status: blogForm.status };
    if (blogForm.publishAt) body.published_at = new Date(blogForm.publishAt).toISOString();
    persist(() => resources.blogs.update(id, body), 'Post updated.');
  };

  const openEditCareer = (item: any) => { const c = item._raw ?? {}; setCareerForm({ job_title: c.job_title ?? "", department: c.department ?? "", location: c.location ?? "", description: c.description ?? "", requirements: c.requirements ?? "", status: c.status ?? "open" }); setActionModal({ title: 'Edit Job', type: 'form', item }); };
  const handleToggleCareer = (item: any) => { const id = item?._raw?.id; if (!id) return; const next = item._raw.status === "open" ? "closed" : "open"; persist(() => resources.careers.update(id, { status: next } as any), `Job ${next === "open" ? "reopened" : "closed"}.`); };
  const handleAddCareer = () => {
    const { job_title, department, location, description, requirements } = careerForm;
    if (!job_title.trim() || !description.trim() || !requirements.trim()) { showToast('Job title, description and requirements are required.', 'error'); return; }
    setCareerForm({ job_title: "", department: "", location: "", description: "", requirements: "" });
    persist(() => resources.careers.create({ job_title: job_title.trim(), department: department.trim() || "General", location: location.trim() || "Remote", description: description.trim(), requirements: requirements.trim() } as any), 'Job posted.');
  };
  const handleUpdateCareer = () => {
    const id = actionModal?.item?._raw?.id; if (!id) { setActionModal(null); return; }
    persist(() => resources.careers.update(id, { job_title: careerForm.job_title.trim(), description: careerForm.description.trim() || undefined, requirements: careerForm.requirements.trim() || undefined, status: careerForm.status } as any), 'Job updated.');
  };

  // Forward path of each backend state machine (see core/constants.py transitions).
  const WF_NEXT: Record<string, string[]> = {
    tax: ["received","collecting_documents","preparing_return","internal_review","client_approval_pending","client_approved","return_filed","acknowledgement_received"],
    gst: ["received","sales_collected","purchase_collected","reconciled","return_prepared","return_reviewed","return_filed","acknowledgement_received"],
    audit: ["assigned","document_requested","verifying","observation_recorded","draft_prepared","partner_review","final_approved","completed"],
  };
  const advance = (kind: 'tax'|'gst'|'audit', item: any) => {
    const raw = item._raw ?? {};
    const order = WF_NEXT[kind];
    const i = order.indexOf(_lc(raw.status ?? ""));
    const next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;
    if (!raw.id || !next) { showToast('Already at the final stage.', 'info'); return; }
    const res = kind === 'tax' ? resources.taxReturns : kind === 'gst' ? resources.gstReturns : resources.audits;
    persist(() => res.update(raw.id, { status: next } as any), `Moved to ${_tc(next)}.`);
  };

  const handleAddInvoice = () => {
    const client = clients.find(c => c._raw?.id === invoiceForm.clientId);
    if (!client) { showToast('Please select a client.', 'error'); return; }
    if (!invoiceForm.due) { showToast('Please set a due date.', 'error'); return; }
    const amount = Number((invoiceForm.amount || "").replace(/[^0-9.]/g, ""));
    if (!amount) { showToast('Please enter a valid amount.', 'error'); return; }
    const body: any = { client_id: client._raw.id, branch_id: client._raw.branch_id, due_date: invoiceForm.due,
      items: [{ description: invoiceForm.description.trim() || "Professional services", quantity: 1, unit_price: String(amount), tax_rate_percent: "18.00" }] };
    setInvoiceForm({ clientId: "", due: "", description: "", amount: "" });
    persist(() => resources.invoices.create(body), 'Invoice created.');
  };
  // --- simple PDF helper (certificates, payslips) ---------------------------
  const makePdf = (title: string, lines: string[], file: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(16); doc.text("Finovara Chartered Accountants LLP", 40, 50);
    doc.setFontSize(13); doc.text(title, 40, 78);
    doc.setFontSize(10);
    lines.forEach((l, i) => doc.text(l, 40, 110 + i * 18));
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 800);
    doc.save(file);
    showToast(`${title} downloaded.`, 'success');
  };

  // CSV: date,description,debit,credit[,reference] — one line per transaction.
  const handleBankImport = () => {
    const client = clients.find(c => c._raw?.id === bankForm.clientId);
    if (!client) { showToast('Please select a client.', 'error'); return; }
    const rows = bankForm.csv.split("\n").map(l => l.trim()).filter(Boolean).map((line) => {
      const [d, desc, dr, cr, ref] = line.split(",").map(s => (s ?? "").trim());
      return { transaction_date: d, description: desc || "Bank line",
        debit_amount: String(Number(dr || 0)), credit_amount: String(Number(cr || 0)),
        ...(ref ? { reference: ref } : {}) };
    }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.transaction_date));
    if (!rows.length) { showToast('No valid rows. Use: YYYY-MM-DD,description,debit,credit', 'error'); return; }
    persist(() => api.post("/bank-transactions/import", { client_id: client._raw.id, rows }), `${rows.length} lines imported.`);
  };

  const handleUploadDocument = () => {
    if (!docUploadForm.file) { showToast('Choose a file to upload.', 'error'); return; }
    if (!docUploadForm.clientId) { showToast('Select the client this document belongs to.', 'error'); return; }
    const form = new FormData();
    form.append("file", docUploadForm.file);
    form.append("client_id", docUploadForm.clientId);
    form.append("file_category", docUploadForm.category);
    persist(() => api.post("/documents/upload", undefined, { form }), 'Document uploaded.');
  };

  const handleReviseSalary = () => {
    const id = actionModal?.item?._raw?.id;
    const amount = Number((salaryForm.salary || "").replace(/[^0-9.]/g, ""));
    if (!id) { setActionModal(null); return; }
    if (!amount) { showToast('Enter a valid salary.', 'error'); return; }
    persist(() => resources.payrollProfiles.update(id, { base_salary: String(amount) } as any), 'Salary revised.');
  };

  // CSV: name,code,bank_account,ifsc,salary — one employee per line.
  const handleStaffBulkImport = async () => {
    const client = clients.find(c => c._raw?.id === staffCsv.clientId);
    if (!client) { showToast('Please select a client.', 'error'); return; }
    const rows = staffCsv.csv.split("\n").map(l => l.trim()).filter(Boolean).map((line) => {
      const [name, code, acct, ifsc, sal] = line.split(",").map(s => (s ?? "").trim());
      return { client_id: client._raw.id, employee_name: name, employee_code: code,
        bank_account_no: acct, bank_ifsc: (ifsc || "").toUpperCase(), base_salary: String(Number(sal || 0)) };
    }).filter(r => r.employee_name && r.employee_code && r.bank_account_no && r.bank_ifsc && Number(r.base_salary) > 0);
    if (!rows.length) { showToast('No valid rows. Use: name,code,account,IFSC,salary', 'error'); return; }
    let ok = 0;
    for (const row of rows) { try { await resources.payrollProfiles.create(row as any); ok++; } catch { /* skip bad row */ } }
    await loadData();
    setActionModal(null);
    showToast(`${ok}/${rows.length} payroll profiles imported.`, ok ? 'success' : 'error');
  };

  const handleSendChat = () => {
    const client = clients.find(c => c._raw?.id === chatForm.clientId);
    const text = chatForm.text.trim();
    if (!client) { showToast('Please select a client.', 'error'); return; }
    if (!text) { showToast('Enter a message.', 'error'); return; }
    setChatForm(p => ({ ...p, text: "" }));
    persist(() => resources.messages.create({ client_id: client._raw.id, message_text: text } as any), 'Message sent.');
  };

  const handleAddReminder = () => {
    if (!session?.user_id) { showToast('No session user.', 'error'); return; }
    const body = reminderForm.body.trim() || reminderForm.subject.trim();
    if (!body) { showToast('Enter a reminder note.', 'error'); return; }
    const payload: any = { recipient_id: session.user_id, channel: "in_app", body,
      subject: reminderForm.subject.trim() || "Reminder" };
    if (reminderForm.when) payload.send_after = new Date(reminderForm.when).toISOString();
    persist(() => resources.notifications.create(payload), 'Reminder set.');
  };

  const handleAddChecklist = () => {
    const item = checklistForm.item.trim();
    if (!checklistForm.auditId) { showToast('No audit selected.', 'error'); return; }
    if (item.length < 2) { showToast('Enter a checklist item.', 'error'); return; }
    persist(() => resources.auditChecklists.create({ audit_id: checklistForm.auditId, item_name: item,
      description: checklistForm.desc.trim() || undefined } as any), 'Checklist item added.');
  };
  const handleAddObservation = () => {
    const title = obsForm.title.trim(), desc = obsForm.desc.trim();
    if (!obsForm.auditId) { showToast('No audit selected.', 'error'); return; }
    if (title.length < 2 || !desc) { showToast('Title and description are required.', 'error'); return; }
    persist(() => resources.auditObservations.create({ audit_id: obsForm.auditId, title,
      description: desc, risk_level: obsForm.risk } as any), 'Observation recorded.');
  };

  const handleAddAudit = () => {
    const client = clients.find(c => c._raw?.id === auditForm.clientId);
    const service = services.find(s => s._raw?.id === auditForm.serviceId);
    if (!client) { showToast('Please select a client.', 'error'); return; }
    if (!service) { showToast('Please select a service.', 'error'); return; }
    if (!auditForm.start) { showToast('Please set a start date.', 'error'); return; }
    persist(() => resources.audits.create({ client_id: client._raw.id, service_id: service._raw.id,
      start_date: auditForm.start, end_date: auditForm.end || undefined,
      audit_type: _lc(auditForm.type), risk_rating: _lc(auditForm.risk) } as any), 'Audit created.');
  };
  const setAuditRisk = (item: any, risk: string) => {
    if (!item._raw?.id) return;
    persist(() => resources.audits.update(item._raw.id, { risk_rating: risk } as any), `Risk set to ${risk}.`);
  };
  const handleSaveTaxDetails = () => {
    const id = actionModal?.item?._raw?.id; if (!id) { setActionModal(null); return; }
    const body: any = { refund_status: taxForm.refundStatus };
    if (taxForm.liability) body.calculated_tax_liability = taxForm.liability;
    if (taxForm.income) body.calculated_taxable_income = taxForm.income;
    if (taxForm.refund) body.refund_claimed = taxForm.refund;
    persist(() => resources.taxReturns.update(id, body), 'Tax details saved.');
  };
  const handleRunPayroll = () => {
    const branch_id = clients[0]?._raw?.branch_id ?? employees[0]?._raw?.branch_id;
    if (!branch_id) { showToast('No branch available to run payroll.', 'error'); return; }
    persist(() => resources.payrollRuns.create({ branch_id, period_month: Number(payrollForm.month), period_year: Number(payrollForm.year) } as any), 'Payroll run created.');
  };
  const advancePayroll = (item: any) => {
    const order = ["draft", "calculated", "verified", "paid"];
    const i = order.indexOf(_lc(item._raw?.status ?? ""));
    const next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;
    if (!item._raw?.id || !next) { showToast('Payroll already paid.', 'info'); return; }
    persist(() => resources.payrollRuns.update(item._raw.id, { status: next } as any), `Payroll ${next}.`);
  };
  const handleAddLedger = () => {
    if (!ledgerForm.code.trim() || !ledgerForm.name.trim()) { showToast('Account code and name are required.', 'error'); return; }
    persist(() => resources.ledgerAccounts.create({ account_code: ledgerForm.code.trim(), account_name: ledgerForm.name.trim(), account_type: _lc(ledgerForm.type) } as any), 'Ledger account created.');
  };

  const handleAddQuery = () => {
    const client = clients.find(c => c._raw?.id === queryForm.clientId);
    const subject = queryForm.subject.trim();
    if (!client) { showToast('Please select a client.', 'error'); return; }
    if (!subject) { showToast('Please enter a subject.', 'error'); return; }
    const query_text = queryForm.description.trim() || subject;
    setQueryForm({ clientId: "", subject: "", description: "" });
    persist(() => resources.queries.create({ client_id: client._raw.id, subject, query_text } as any), 'Query raised.');
  };

  const handleMarkInvoicePaid = (item: any) => {
    const i = item._raw ?? {};
    const outstanding = Number(i.outstanding_amount ?? i.total_amount ?? 0);
    if (!i.id || outstanding <= 0) { showToast('Nothing outstanding on this invoice.', 'info'); return; }
    persist(() => resources.payments.create({ invoice_id: i.id, amount: String(outstanding), payment_method: 'cash' } as any), 'Payment recorded.');
  };

  const handleMarkAllRead = async () => {
    try { await api.post("/notifications/read-all", {}); await loadData(); } catch { /* fall through to local clear */ }
    setNotifications([]);
    showToast('All notifications marked as read.', 'success');
  };

  // --- New feature handlers: Settings, Journal Entry, Attendance, Meetings, etc. ---
  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get<any>("/settings/system");
      setSettings(Array.isArray(data) ? data : data?.data ?? []);
    } catch { /* ignore */ }
  }, []);

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await api.put("/settings/system", { key, value });
      showToast(`Setting ${key} updated.`, 'success');
      loadSettings();
    } catch { showToast('Could not update setting.', 'error'); }
  };

  const handleAddVoucher = () => {
    const { date, description, debit_account, credit_account, amount, clientId } = voucherForm;
    if (!date || !description || !amount || !clientId) { showToast('Date, description, amount and client are required.', 'error'); return; }
    const amt = Number(amount);
    if (!amt) { showToast('Amount must be a valid number.', 'error'); return; }
    const client = clients.find(c => c._raw?.id === clientId);
    if (!client) { showToast('Please select a valid client.', 'error'); return; }
    if (!debit_account || !credit_account) { showToast('Select both a debit and a credit account.', 'error'); return; }
    persist(() => api.post("/vouchers", {
      client_id: clientId,
      branch_id: client._raw.branch_id,
      voucher_type: "journal",
      voucher_date: date,
      narration: description.trim(),
      lines: [
        { account_id: debit_account, debit_amount: String(amt), credit_amount: "0" },
        { account_id: credit_account, debit_amount: "0", credit_amount: String(amt) },
      ],
    } as any), 'Voucher created.');
    setVoucherForm({ date: "", description: "", debit_account: "", credit_account: "", amount: "", clientId: "" });
  };

  const loadTrialBalance = async () => {
    if (!tbClientId) { showToast('Please select a client.', 'error'); return; }
    try {
      const data = await api.get<any>(`/vouchers/trial-balance/${tbClientId}`);
      const rows = data?.accounts ?? data?.data?.accounts ?? [];
      setTrialBalance(Array.isArray(rows) ? rows : []);
      showToast('Trial balance loaded.', 'success');
    } catch { showToast('Could not load trial balance.', 'error'); }
  };

  const handleAddAttendance = () => {
    const { employee_id, period_month, period_year, days_present, total_days } = attendanceForm;
    if (!employee_id) { showToast('Please select an employee.', 'error'); return; }
    persist(() => resources.attendance.create({
      employee_profile_id: employee_id,
      period_month: Number(period_month),
      period_year: Number(period_year),
      days_present: Number(days_present),
      total_working_days: Number(total_days),
      month: Number(period_month),
      year: Number(period_year),
    } as any), 'Attendance recorded.');
  };

  const handleAddMeeting = () => {
    const { lead_id, scheduled_date, notes } = meetingForm;
    if (!lead_id || !scheduled_date) { showToast('Lead and date are required.', 'error'); return; }
    persist(() => resources.consultations.create({
      lead_id,
      scheduled_at: scheduled_date,
      notes: notes.trim() || undefined,
      status: 'scheduled',
    } as any), 'Meeting scheduled.');
    setMeetingForm({ lead_id: "", scheduled_date: "", notes: "" });
  };

  const handleReconcileGst = async (item: any) => {
    const id = item._raw?.id;
    if (!id) { showToast('No GST return selected.', 'info'); return; }
    try {
      const data = await api.get<any>(`/gst-returns/${id}/reconciliation`);
      const result = data?.data ?? data;
      showToast(`Liability: ${_money(result.net_liability ?? 0)} · Late fee: ${_money(result.late_fee ?? 0)}`, 'info');
    } catch { showToast('Could not run reconciliation.', 'error'); }
  };

  // Role definitions
  const roles = [
    { name: "Super Admin",          desc: "Complete system access",                      color: "#e53e3e", bg: "#FFF0F0", icon: Shield },
    { name: "Managing Partner",     desc: "Firm reports and approvals",                  color: "#087F5B", bg: "#EAF4F0", icon: Star },
    { name: "Chartered Accountant", desc: "Assigned client and professional work",        color: "#52606D", bg: "#EEF1F5", icon: Briefcase },
    { name: "Audit Manager",        desc: "Audit teams and assignments",                  color: "#C8A45D", bg: "#FFF4E0", icon: FileCheck },
    { name: "Tax Manager",          desc: "Tax services and filings",                     color: "#087F5B", bg: "#EAF4F0", icon: FileText },
    { name: "GST Consultant",       desc: "GST clients and returns",                      color: "#52606D", bg: "#EEF1F5", icon: BarChart2 },
    { name: "Partner Accountant",   desc: "Books, reconciliations and reports",           color: "#C8A45D", bg: "#FFF4E0", icon: _PieChartIcon },
    { name: "Payroll Executive",    desc: "Payroll module and professional work",          color: "#087F5B", bg: "#EAF4F0", icon: Users },
    { name: "Relationship Manager", desc: "Client communication assignments",              color: "#52606D", bg: "#EEF1F5", icon: HelpCircle },
    { name: "Accounts Admin",       desc: "Filings, invoices and payments",               color: "#C8A45D", bg: "#FFF4E0", icon: ReceiptText },
    { name: "Content Manager",      desc: "Website content management",                   color: "#e53e3e", bg: "#FFF0F0", icon: Globe },
    { name: "Client",               desc: "Own services, files and reports",              color: "white", bg: "#102A43", icon: UserCheck },
  ];

  const roleTabMap: Record<string, string[]> = {
    "Super Admin":          ["Dashboard","Settings","Portal Access Requests","Client Management","Employee Management","Service Management","Task Assignment","Compliance Calendar","Document Management","Audit Workflow","Tax-Return Tracking","GST-Return Tracking","Invoice Management","Payment Tracking","Payroll","Ledger Accounts","Notifications","Reports","Blog Management","Careers Management","Website CMS","Lead Management","Role-Based Access","Total Clients","Active Services","Pending Filings","Due This Week","Overdue Tasks","Documents Awaiting Review","Open Queries","Monthly Revenue","Outstanding Invoices","Staff Workload","Service-wise Client Count"],
    "Managing Partner":     ["Dashboard","Branch Performance","Profit Analysis","Portal Access Requests","Client Management","Audit Workflow","Tax-Return Tracking","GST-Return Tracking","Invoice Management","Reports","Monthly Revenue","Outstanding Invoices","Payment Tracking","Notifications","Staff Workload","Service-wise Client Count","Lead Management","Employee Management","Service Management"],
    "Chartered Accountant": ["Dashboard","Client Management","Task Assignment","Compliance Calendar","Document Management","Tax-Return Tracking","GST-Return Tracking","Open Queries","Active Services","Pending Filings","Due This Week","Overdue Tasks","Documents Awaiting Review"],
    "Audit Manager":        ["Dashboard","Client Management","Audit Workflow","Document Management","Task Assignment","Compliance Calendar","Documents Awaiting Review","Reports","Staff Workload"],
    "Tax Manager":          ["Dashboard","Client Management","Tax-Return Tracking","Compliance Calendar","Task Assignment","Pending Filings","Due This Week","Overdue Tasks","Document Management","Reports"],
    "GST Consultant":       ["Dashboard","Client Management","GST-Return Tracking","Compliance Calendar","Task Assignment","Document Management","Pending Filings","Due This Week","Overdue Tasks"],
    "Partner Accountant":   ["Dashboard","Ledger Accounts","Vouchers","Client Management","Document Management","Reports","Monthly Revenue","Invoice Management","Payment Tracking"],
    "Payroll Executive":    ["Dashboard","Payroll","Client Management","Task Assignment","Document Management","Due This Week","Compliance Calendar"],
    "Relationship Manager": ["Dashboard","Client Management","Open Queries","Notifications","Lead Management","Active Services"],
    "Accounts Admin":       ["Dashboard","Invoice Management","Payment Tracking","Outstanding Invoices","Client Management","Reports","Notifications"],
    "Content Manager":      ["Blog Management","Careers Management","Website CMS"],
    "Client":               ["Active Services","Documents Awaiting Review","Open Queries","Notifications","Reports"],
  };

  const allTabDefs = [
    { label: "Dashboard",                 icon: BarChart2 },
    { label: "Client Management",         icon: Users },
    { label: "Employee Management",       icon: UserCheck },
    { label: "Service Management",        icon: Briefcase },
    { label: "Task Assignment",           icon: ClipboardList },
    { label: "Compliance Calendar",       icon: Calendar },
    { label: "Document Management",       icon: Folder },
    { label: "Audit Workflow",            icon: FileCheck },
    { label: "Tax-Return Tracking",       icon: FileText },
    { label: "GST-Return Tracking",       icon: BarChart2 },
    { label: "Invoice Management",        icon: ReceiptText },
    { label: "Payment Tracking",          icon: CreditCard },
    { label: "Notifications",             icon: Bell },
    { label: "Reports",                   icon: _PieChartIcon },
    { label: "Blog Management",           icon: BookOpen },
    { label: "Careers Management",        icon: Award },
    { label: "Website CMS",               icon: Globe },
    { label: "Portal Access Requests",    icon: UserCheck },
    { label: "Lead Management",           icon: Target },
    { label: "Role-Based Access",         icon: Shield },
    { label: "Payroll",                   icon: Users },
    { label: "Ledger Accounts",           icon: _PieChartIcon },
    { label: "Vouchers",                  icon: ReceiptText },
    { label: "Settings",                  icon: Settings },
    { label: "Branch Performance",        icon: Building2 },
    { label: "Profit Analysis",           icon: TrendingUp },
    { label: "Total Clients",             icon: Users },
    { label: "Active Services",           icon: CheckCircle },
    { label: "Pending Filings",           icon: ClipboardList },
    { label: "Due This Week",             icon: Calendar },
    { label: "Overdue Tasks",             icon: AlertTriangle },
    { label: "Documents Awaiting Review", icon: Folder },
    { label: "Open Queries",              icon: HelpCircle },
    { label: "Monthly Revenue",           icon: TrendingUp },
    { label: "Outstanding Invoices",      icon: ReceiptText },
    { label: "Staff Workload",            icon: Briefcase },
    { label: "Service-wise Client Count", icon: _PieChartIcon },
  ];

  const tabs = allTabDefs.filter(t => (roleTabMap[userRole] || []).includes(t.label));
  
  // Ensure activeTab is valid for this role, else reset to first available
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.label === activeTab)) {
      setActiveTab(tabs[0].label);
    }
  }, [userRole, activeTab, tabs]);

  // --- derived metrics + chart data from the live lists ---------------------
  const outstanding = invoices.reduce((s, i) => s + Math.max(_num(i._raw?.total_amount) - _num(i._raw?.paid_amount), 0), 0);
  const paidTotal = invoices.reduce((s, i) => s + _num(i._raw?.paid_amount), 0);
  const revenue = invoices.reduce((s, i) => s + _num(i._raw?.total_amount), 0);
  const overdueTasks = tasks.filter((t) => t._raw?.status !== "done" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).length;
  const pendingFilings = taxReturns.filter((t) => _lc(t.status) !== "filed").length + gstReturns.filter((g) => _lc(g.status) !== "filed").length;

  const _byStatus = (rows: any[], key = "status") => {
    const m: Record<string, number> = {};
    for (const r of rows) { const k = _tc(r._raw?.[key] ?? r[key]) || "Other"; m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  };
  const taskStatusData = _byStatus(tasks);
  const invoiceSplit = [
    { name: "Paid", value: Math.round(paidTotal) },
    { name: "Outstanding", value: Math.round(outstanding) },
  ].filter((d) => d.value > 0);
  const INV_COLORS = [CHART.emerald, CHART.amber];
  const _inr = (v: number) => v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

  // Spec KPIs (BRD §1). All derived from the loaded backend lists.
  const activeClients = clients.filter((c: any) => c.status === 'Active').length;
  const activeAudits = audits.filter((a: any) => _lc(a._raw?.status) !== 'completed').length;
  const gstPending = gstReturns.filter((g: any) => _lc(g.status) !== 'filed').length;
  const taxPending = taxReturns.filter((t: any) => _lc(t.status) !== 'filed').length;
  const payrollRunning = payrollRuns.filter((p: any) => _lc(p._raw?.status) !== 'paid').length;
  const overdueCompliance = compliance.filter((c: any) => c.urgency === 'critical').length;
  const utilisation = employees.length
    ? Math.round((tasks.filter((t: any) => _lc(t._raw?.status) !== 'done').length / (employees.length * 25)) * 100)
    : 0;

  const kpiCards = [
    { label: "Total Clients",       value: String(clients.length),        change: "live", icon: Users,        color: "#087F5B", bg: "#EAF4F0" },
    { label: "Active Clients",      value: String(activeClients),         change: "live", icon: CheckCircle,  color: "#087F5B", bg: "#EAF4F0" },
    { label: "Revenue (billed)",    value: _inr(revenue),                 change: "live", icon: TrendingUp,   color: "#087F5B", bg: "#EAF4F0" },
    { label: "Pending Payments",    value: _inr(outstanding),             change: "live", icon: ReceiptText,  color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Active Audits",       value: String(activeAudits),          change: "live", icon: FileCheck,    color: "#087F5B", bg: "#EAF4F0" },
    { label: "GST Pending",         value: String(gstPending),            change: "live", icon: BarChart2,    color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Tax Pending",         value: String(taxPending),            change: "live", icon: FileText,     color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Payroll Running",     value: String(payrollRunning),        change: "live", icon: Users,        color: "#087F5B", bg: "#EAF4F0" },
    { label: "Employee Utilization",value: `${utilisation}%`,             change: "live", icon: Briefcase,    color: "white",   bg: "#EEF1F5" },
    { label: "Due This Week",       value: String(dueTasks.length),       change: "live", icon: Calendar,     color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Overdue Compliance",  value: String(overdueCompliance),     change: "live", icon: AlertTriangle,color: "#e53e3e", bg: "#FFF0F0" },
    { label: "Open Queries",        value: String(queries.length),        change: "live", icon: HelpCircle,   color: "white",   bg: "#EEF1F5" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard": return (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpiCards.map(({ label, value, change, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon size={17} style={{ color }} /></div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: bg, color }}>{change}</span>
                </div>
                <div className="text-2xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{value}</div>
                <div className="text-xs text-[#52606D] mt-1" style={{ fontFamily: "Inter" }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="font-bold text-[#102A43] mb-0.5" style={{ fontFamily: "Manrope" }}>Tasks by Status</div>
              <div className="text-xs text-[#52606D] mb-3">{tasks.length} tasks total</div>
              {taskStatusData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={taskStatusData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#52606D", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fill: "#52606D", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#0d1f30", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={CHART.emerald} maxBarSize={46}>
                      <LabelList dataKey="value" position="top" fill="#cbd5e1" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-[#52606D] py-12 text-center">No task data yet.</div>}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="font-bold text-[#102A43] mb-0.5" style={{ fontFamily: "Manrope" }}>Receivables</div>
              <div className="text-xs text-[#52606D] mb-3">Paid vs outstanding &middot; {_inr(revenue)} billed</div>
              {invoiceSplit.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={invoiceSplit} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2} stroke="#102A43" strokeWidth={2}>
                      {invoiceSplit.map((_e, i) => <Cell key={i} fill={INV_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => _inr(Number(v))} contentStyle={{ background: "#0d1f30", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                    <Legend formatter={(v) => <span style={{ color: "#cbd5e1", fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-[#52606D] py-12 text-center">No invoice data yet.</div>}
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="font-bold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>Recent Activity</div>
              {(() => {
                const feed: { a: string; t: string; type: string }[] = [];
                for (const d of reviewDocs.slice(0, 2)) feed.push({ a: `Document awaiting review: ${d.doc}`, t: d.uploaded ?? "—", type: "warning" });
                for (const i of invoices.filter((x: any) => x.status === "Paid").slice(0, 2)) feed.push({ a: `Invoice ${i.inv} paid`, t: i.date, type: "success" });
                for (const t of taxReturns.filter((x: any) => _lc(x.status) === "filed").slice(0, 1)) feed.push({ a: `${t.itr} filed for ${t.client}`, t: t.date ?? "—", type: "success" });
                for (const c of compliance.filter((x: any) => x.urgency === "critical").slice(0, 2)) feed.push({ a: `Overdue: ${c.filing}`, t: c.date, type: "warning" });
                for (const l of leads.slice(0, 1)) feed.push({ a: `New lead: ${l.name}`, t: l.followUp ?? "—", type: "info" });
                return feed.length ? feed.slice(0, 6) : [{ a: "No recent activity yet.", t: "", type: "info" }];
              })().map(({ a, t, type }) => (
                <div key={a} className="flex items-center gap-3 py-2.5 border-t border-[#E2E8F0]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: type==="success"?"#087F5B":type==="warning"?"#C8A45D":"#102A43" }} />
                  <span className="text-sm text-[#102A43] flex-1" style={{ fontFamily: "Inter" }}>{a}</span>
                  <span className="text-xs text-[#52606D] flex-shrink-0">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="font-bold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>This Month's Filing Progress</div>
              {[
                { label: "Income Tax", done: taxReturns.filter((t: any) => _lc(t.status) === "filed").length, total: Math.max(taxReturns.length, 1) },
                { label: "GST Returns", done: gstReturns.filter((g: any) => _lc(g.status) === "filed").length, total: Math.max(gstReturns.length, 1) },
                { label: "Compliance", done: compliance.filter((c: any) => _lc(c.status) === "filed").length, total: Math.max(compliance.length, 1) },
                { label: "Tasks", done: tasks.filter((t: any) => _lc(t._raw?.status) === "done").length, total: Math.max(tasks.length, 1) },
              ].map(({ label, done, total }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#102A43]" style={{ fontFamily: "Inter" }}>{label}</span>
                    <span className="text-[#52606D]">{done}/{total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(done/total)*100}%`, background: "linear-gradient(90deg, #087F5B, #065a40)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      case "Role-Based Access": return (
        <div className="space-y-4">
          {employees.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No staff to show roles for.</div>}
          {Object.entries(employees.reduce((acc: Record<string, string[]>, e: any) => {
            const key = e.role || "Staff"; (acc[key] ||= []).push(e.n); return acc;
          }, {})).map(([role, users]) => ({
            role, users: users as string[],
            perms: roleTabMap[role] ? roleTabMap[role].slice(0, 5) : ["Assigned Tasks", "Upload Docs"],
            color: "#087F5B", bg: "#EAF4F0",
          })).map(({ role, users, perms, color, bg }) => (
            <div key={role} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: bg, color }}>{role}</span>
                  <span className="text-xs text-[#52606D]">{users.length} user{users.length>1?"s":""}</span>
                </div>
                <button onClick={() => setActionModal({title: 'Edit Permissions', type: 'form'})}  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Edit Permissions</button>
              </div>
              <div className="text-xs text-[#52606D] mb-2" style={{ fontFamily: "Inter" }}>Users: {users.join(", ")}</div>
              <div className="flex flex-wrap gap-2">
                {perms.map(p => <span key={p} className="text-xs px-2 py-1 rounded-lg" style={{ background: "white", color: "white", border: "1px solid rgba(0,0,0,0.07)" }}>{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      );

      case "Total Clients": return (
        <div>
          <div className="flex gap-3 mb-5">
            {[["All", String(clients.length)], ["Active", String(clients.filter(c => c.status === 'Active').length)], ["Inactive", String(clients.filter(c => c.status === 'Inactive').length)]].map(([l,c]) => (
              <div key={l} className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-[#102A43]"><span className="text-[#087F5B] font-extrabold mr-1">{c}</span>{l}</div>
            ))}
          </div>
          {clients.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No clients yet.</div>}
          <div className="space-y-3">
            {clients.map(({ n: name, ca, svc: services, status }) => (
              <div key={name} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{name[0]}</div>
                  <div>
                    <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{name}</div>
                    <div className="text-xs text-[#52606D]">{ca} · {services} services</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: status==="Active"?"#EAF4F0":"#102A43", color: status==="Active"?"#087F5B":"#52606D" }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      );

      case "Active Services": return (
        <div className="space-y-3">
          {services.filter((s:any) => s.active).length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No active services.</div>}
          {services.filter((s:any) => s.active).map((s:any) => ({ svc: s.svc, clients: Number(s.clients) || 0, staff: s.cat || "—", due: s.price || "—", pct: 100 })).map(({ svc, clients, staff, due, pct }) => (
            <div key={svc} className="p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{svc}</div>
                <span className="text-xs font-bold text-[#087F5B]">{clients} clients</span>
              </div>
              <div className="flex justify-between text-xs text-[#52606D] mb-2"><span>Assigned: {staff}</span><span>Due: {due}</span></div>
              <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #087F5B, #065a40)" }} />
              </div>
            </div>
          ))}
        </div>
      );

      case "Pending Filings": return (
        <div className="space-y-3">
          {[
            ...taxReturns.filter((t:any) => _lc(t.status) !== "filed").map((t:any) => ({ client: t.client, filing: `${t.itr} ${t.fy}`, due: t.date, priority: "High" })),
            ...gstReturns.filter((g:any) => _lc(g.status) !== "filed").map((g:any) => ({ client: g.client, filing: `${g.form} ${g.period}`, due: g.status, priority: "Medium" })),
          ].length === 0 ? [{ client: "—", filing: "No pending filings", due: "", priority: "Low" }] : [
            ...taxReturns.filter((t:any) => _lc(t.status) !== "filed").map((t:any) => ({ client: t.client, filing: `${t.itr} ${t.fy}`, due: t.date, priority: "High" })),
            ...gstReturns.filter((g:any) => _lc(g.status) !== "filed").map((g:any) => ({ client: g.client, filing: `${g.form} ${g.period}`, due: g.status, priority: "Medium" })),
          ].map(({ client, filing, due, priority }) => (
            <div key={filing+client} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div>
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{filing}</div>
                <div className="text-xs text-[#52606D]">{client} · Due: {due}</div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0", color: priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
            </div>
          ))}
        </div>
      );

      case "Due This Week": return (
        <div className="space-y-3">
          {dueTasks.map(({ id, task, date, staff, status }) => (
            <div key={task} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="text-center flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: "#EAF4F0" }}>
                <div className="text-xs font-bold text-[#087F5B]">{date.split(" ")[0]}</div>
                <div className="text-sm font-extrabold text-[#102A43]">{date.split(" ").slice(1).join(" ")}</div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <div className="text-xs text-[#52606D]">Assigned: {staff}</div>
              </div>
              <button onClick={() => handleMarkTaskDone({ id, task, status })} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Mark Done</button>
            </div>
          ))}
        </div>
      );

      case "Overdue Tasks": return (
        <div className="space-y-3">
          {tasks.filter((t:any) => t._raw?.status !== "done" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No overdue tasks.</div>}
          {tasks.filter((t:any) => t._raw?.status !== "done" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).map((t:any) => ({
            task: `${t.task} – ${t.client}`,
            overdue: `${Math.max(1, Math.round((Date.now() - new Date(t._raw.due_date).getTime()) / 86400000))} days`,
            staff: t.assignee, impact: t.priority === "High" ? "Penalty Risk" : "Follow up",
          })).map(({ task, overdue, staff, impact }) => (
            <div key={task} className="p-4 rounded-2xl border" style={{ background: "#FFF8F8", borderColor: "rgba(229,62,62,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#FFF0F0", color: "#e53e3e" }}>Overdue {overdue}</span>
              </div>
              <div className="flex justify-between text-xs text-[#52606D]"><span>Staff: {staff}</span><span className="font-semibold" style={{ color: "#e53e3e" }}>⚠ {impact}</span></div>
            </div>
          ))}
        </div>
      );

      case "Documents Awaiting Review": return (
        <div className="space-y-3">
          {reviewDocs.map(({ id, doc, client, uploaded, reviewer }) => (
            <div key={doc} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF4E0" }}><Folder size={16} style={{ color: "#C8A45D" }} /></div>
                <div>
                  <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{doc}</div>
                  <div className="text-xs text-[#52606D]">{client} · {uploaded} · Reviewer: {reviewer}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleReviewDecision({ id, doc }, 'approve')} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#102A43]" style={{ background: "#087F5B" }}>Approve</button>
                <button onClick={() => handleReviewDecision({ id, doc }, 'reject')} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#FFF0F0", color: "#e53e3e" }}>Reject</button>
              </div>
            </div>
          ))}
          {reviewDocs.length === 0 && <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl border border-[#E2E8F0]">All documents have been reviewed.</div>}
        </div>
      );

      case "Open Queries": return (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => { setQueryForm({ clientId: "", subject: "", description: "" }); setActionModal({title: 'Raise Query', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><HelpCircle size={13} /> Raise Query</button></div>
          {queries.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No open queries.</div>}
          {queries.map(({ q, client, age, staff, priority, _raw }: any) => (
            <div key={_raw?.id ?? q} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{q}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0", color: priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#52606D]">
                <span>{client} · {age} ago · Assigned: {staff}</span>
                {_raw?.id && _lc(_raw.status) !== "resolved" && _lc(_raw.status) !== "closed" && (
                  <button onClick={() => persist(async () => {
                    // open -> resolved isn't a valid direct transition; answered is required first.
                    if (_lc(_raw.status) === "open") await resources.queries.update(_raw.id, { status: "answered" } as any);
                    await resources.queries.update(_raw.id, { status: "resolved" } as any);
                  }, 'Query resolved.')} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#087F5B,#065a40)" }}>Resolve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      );

      case "Monthly Revenue": return (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[{ l: "Billed", v: _inr(revenue), c: "live", color: "#087F5B", bg: "#EAF4F0" }, { l: "Collected", v: _inr(paidTotal), c: "", color: "white", bg: "#EEF1F5" }, { l: "Outstanding", v: _inr(outstanding), c: "", color: "#C8A45D", bg: "#FFF4E0" }].map(({ l, v, c, color, bg }) => (
              <div key={l} className="p-4 bg-white rounded-2xl border border-[#E2E8F0] text-center">
                <div className="text-xs text-[#52606D] mb-1" style={{ fontFamily: "Inter" }}>{l}</div>
                <div className="text-xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{v}</div>
                {c && <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: bg, color }}>{c}</span>}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] mb-4">
            <div className="font-bold text-[#102A43] mb-4" style={{ fontFamily: "Manrope" }}>Revenue by Service</div>
            {[
              { svc: "Income Tax",    rev: "₹12.4L", pct: 29 },
              { svc: "GST Services",  rev: "₹9.8L",  pct: 23 },
              { svc: "Audit",         rev: "₹8.1L",  pct: 19 },
              { svc: "Virtual CFO",   rev: "₹6.5L",  pct: 15 },
              { svc: "Payroll",       rev: "₹3.2L",  pct: 7 },
              { svc: "Others",        rev: "₹2.8L",  pct: 7 },
            ].map(({ svc, rev, pct }) => (
              <div key={svc} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#102A43]">{svc}</span>
                  <span className="text-[#52606D]">{rev} · {pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct*3}%`, background: "linear-gradient(90deg, #087F5B, #C8A45D)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      case "Outstanding Invoices": return (
        <div className="space-y-3">
          {invoices.filter((i:any) => Number(i._raw?.outstanding_amount ?? 0) > 0).length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No outstanding invoices.</div>}
          {invoices.filter((i:any) => Number(i._raw?.outstanding_amount ?? 0) > 0).map((i:any) => ({
            inv: i.inv, client: i.client, amt: _inr(Number(i._raw.outstanding_amount)),
            due: _date(i._raw.due_date),
            days: `${Math.max(0, Math.round((Date.now() - new Date(i._raw.due_date).getTime()) / 86400000))} days`,
          })).map(({ inv, client, amt, due, days }) => (
            <div key={inv} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div>
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{inv} · {client}</div>
                <div className="text-xs text-[#52606D]">Due: {due} · <span style={{ color: "#e53e3e" }}>Overdue by {days}</span></div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{amt}</div>
                <button onClick={() => showToast('Reminder sent successfully!', 'success')}  className="text-xs font-semibold mt-1 px-2 py-1 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Send Reminder</button>
              </div>
            </div>
          ))}
        </div>
      );

      case "Staff Workload": return (
        <div className="space-y-4">
          {employees.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No employees yet.</div>}
          {employees.map((e:any) => ({ name: e.n, role: e.role, tasks: Number(e.tasks) || 0, capacity: 25, clients: Number(e.clients) || 0, color: "#087F5B" })).map(({ name, role, tasks, capacity, clients, color }) => (
            <div key={name} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{name[0]}</div>
                  <div>
                    <div className="font-bold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{name}</div>
                    <div className="text-xs text-[#52606D]">{role} · {clients} clients</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: tasks>capacity?"#FFF0F0":tasks/capacity>0.8?"#FFF4E0":"#EAF4F0", color: tasks>capacity?"#e53e3e":tasks/capacity>0.8?"#C8A45D":"#087F5B" }}>{tasks}/{capacity} tasks</span>
              </div>
              <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((tasks/capacity)*100,100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      );

      case "Service-wise Client Count": return (
        <div className="space-y-3">
          {[
            { svc: "Income Tax",          clients: 892, growth: "+48", pct: 58, color: "#087F5B", bg: "#EAF4F0" },
            { svc: "GST Services",        clients: 743, growth: "+62", pct: 48, color: "#C8A45D", bg: "#FFF4E0" },
            { svc: "Accounting",          clients: 521, growth: "+31", pct: 34, color: "#087F5B", bg: "#EAF4F0" },
            { svc: "Payroll Management",  clients: 389, growth: "+19", pct: 25, color: "white", bg: "#EEF1F5" },
            { svc: "Audit & Assurance",   clients: 267, growth: "+8",  pct: 17, color: "#C8A45D", bg: "#FFF4E0" },
            { svc: "Virtual CFO",         clients: 98,  growth: "+22", pct: 6,  color: "#087F5B", bg: "#EAF4F0" },
            { svc: "Company Incorporation",clients: 78, growth: "+14", pct: 5,  color: "white", bg: "#EEF1F5" },
            { svc: "Startup Advisory",    clients: 54,  growth: "+18", pct: 4,  color: "#087F5B", bg: "#EAF4F0" },
          ].map(({ svc, clients, growth, pct, color, bg }) => (
            <div key={svc} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}><_PieChartIcon size={15} style={{ color }} /></div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{svc}</span>
                  <span className="text-sm font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{clients}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct*1.7}%`, background: color }} />
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: bg, color }}>{growth}</span>
            </div>
          ))}
        </div>
      );

      case "Client Management": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2">{([['All',clients.length],['Active',clients.filter(client => client.status === 'Active').length],['Inactive',clients.filter(client => client.status === 'Inactive').length]] as const).map(([f,count]) => <button onClick={() => setClientFilter(f as 'All'|'Active'|'Inactive')} key={f} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${clientFilter===f ? 'text-white border-transparent' : 'bg-white border-[#E2E8F0] text-[#102A43]'}`} style={clientFilter===f ? { background:'linear-gradient(135deg,#087F5B,#065a40)' } : undefined}>{f} ({count})</button>)}</div>
            <div className="flex gap-2">
              <button onClick={() => { setChatForm({ clientId: clients[0]?._raw?.id ?? "", text: "" }); setActionModal({title: 'Send Message', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><HelpCircle size={13} /> Chat</button>
              {CAN_MANAGE_CLIENTS.includes(userRole) && <button onClick={() => { setFormValues({ clientName: "", caName: "", email: "", pan: "", gstin: "", services: "3", status: "Active" }); setFormErrors({}); setActionModal({title: 'Add Client', type: 'form'}); }}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Users size={13} /> Add Client</button>}
            </div>
          </div>
          <div className="space-y-3">
            {clients.filter(c => clientFilter === 'All' || c.status === clientFilter).map((c) => {
              const {n,ca,pan,gstin,svc,status} = c;
              return (
              <div key={c._raw?.id ?? n} className="p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n[0]}</div>
                    <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#52606D]">CA: {ca} · {svc} services</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#FFF0F0",color:status==="Active"?"#087F5B":"#e53e3e" }}>{status}</span>
                    {CAN_MANAGE_CLIENTS.includes(userRole) && <button onClick={() => openEditClient(c)} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>}
                    <button onClick={() => makePdf("Certificate of Engagement", [`Client: ${n}`, `PAN: ${pan}`, `GSTIN: ${gstin}`, `Engaged services: ${svc}`, `Assigned CA: ${ca}`, `Status: ${status}`, "", "This is to certify that the above client is engaged with", "Finovara Chartered Accountants LLP for the services listed."], `certificate-${n.replace(/\s+/g,'-')}.pdf`)} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Certificate</button>
                    {CAN_MANAGE_CLIENTS.includes(userRole) && <button onClick={() => openDeleteClient(c)} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-[#52606D]"><span>PAN: <span className="font-mono font-semibold text-[#102A43]">{pan}</span></span><span>GSTIN: <span className="font-mono font-semibold text-[#102A43]">{gstin}</span></span></div>
              </div>
            );})}
          </div>
        </div>
      );
      case "Employee Management": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#52606D]">{employees.length} staff members across {new Set(employees.map(employee => employee.role)).size} roles</div>
            <button onClick={() => { setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" }); setActionModal({title: 'Add Employee', type: 'form'}); }}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><UserCheck size={13} /> Add Employee</button>
          </div>
          <div className="space-y-3">
            {employees.map(({n,role,dept,clients,tasks,email}) => (
              <div key={n} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n.split(" ").map((w:string)=>w[0]).join("")}</div>
                  <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#52606D]">{role} · {dept} · {email}</div><div className="text-xs text-[#52606D]">{clients} clients · {tasks} tasks</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>Active</span>
                  <button onClick={() => openEditEmployee({ n, role, dept, clients, tasks, email })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                  <button onClick={() => openDeleteEmployee({ n, role, dept, clients, tasks, email })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Service Management": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#52606D]">{services.filter(service => service.active).length} active services configured</div>
            <button onClick={() => { setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true }); setActionModal({title: 'Add Service', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Add Service</button>
          </div>
          <div className="space-y-3">
            {services.map((s) => {
              const {svc,cat,price,clients,active,_raw} = s;
              return (
              <div key={_raw?.id ?? svc} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{svc}</div><div className="text-xs text-[#52606D]">{cat} · {price} · {clients} clients</div></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:active?"#EAF4F0":"#102A43",color:active?"#087F5B":"#52606D" }}>{active?"Active":"Inactive"}</span>
                  <button onClick={() => openEditService(s)} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                  <button onClick={() => openDeleteService(s)} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                </div>
              </div>
            );})}
          </div>
        </div>
      );
      case "Task Assignment": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#52606D]">{tasks.length} open tasks across {new Set(tasks.map(task => task.assignee)).size} staff members</div>
            <button onClick={() => { setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "todo" }); setActionModal({title: 'Assign Task', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ClipboardList size={13} /> Assign Task</button>
          </div>
          {tasks.map(({task,client,assignee,due,priority,status,_raw}: any) => (
            <div key={task} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex-1"><div className="font-bold text-[#102A43] text-sm mb-1" style={{ fontFamily:"Manrope" }}>{task}</div><div className="flex gap-3 text-xs text-[#52606D]"><span>Client: {client}</span><span>Assignee: {assignee}</span><span>Due: {due}</span></div></div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0",color:priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="In Progress"?"#EAF4F0":status==="Pending"?"#FFF4E0":"#EEF1F5",color:status==="In Progress"?"#087F5B":status==="Pending"?"#C8A45D":"#52606D" }}>{status}</span>
                <button onClick={() => openEditTask({ task, client, assignee, due, priority, status, _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                <button onClick={() => openDeleteTask({ task, client, assignee, due, priority, status, _raw })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      );
      case "Compliance Calendar": return (
        <div>
          <div className="mb-5 p-4 rounded-2xl" style={{ background:"#F7F9FC" }}>
            <div className="font-bold text-[#102A43] text-lg mb-1" style={{ fontFamily:"Manrope" }}>Compliance Deadlines</div>
            <div className="text-[#52606D] text-xs">{compliance.length} filings · {compliance.filter((c:any)=>c.urgency==="critical").length} overdue</div>
          </div>
          {compliance.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No compliance deadlines found.</div>}
          <div className="space-y-3">
            {compliance.map(({date,filing,clients,owner,status,urgency}: any, ci: number) => (
              <div key={filing+ci} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background:urgency==="critical"?"#FFF8F8":"#F7F9FC",borderColor:urgency==="critical"?"rgba(229,62,62,0.2)":"#E2E8F0" }}>
                <div className="text-center flex-shrink-0 w-14 py-2 rounded-xl" style={{ background:urgency==="critical"?"#FFF0F0":urgency==="high"?"#FFF4E0":"#EAF4F0" }}><div className="text-xs font-bold" style={{ color:urgency==="critical"?"#e53e3e":urgency==="high"?"#C8A45D":"#087F5B" }}>{date}</div></div>
                <div className="flex-1"><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{filing}</div><div className="text-xs text-[#52606D]">{clients} · Owner: {owner}</div></div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background:urgency==="critical"?"#FFF0F0":urgency==="high"?"#FFF4E0":"#EAF4F0",color:urgency==="critical"?"#e53e3e":urgency==="high"?"#C8A45D":"#087F5B" }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      );
      case "Document Management": return (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">{[{l:"Total Docs",v:"23",color:"#087F5B"},{l:"Pending Review",v:"0",color:"#C8A45D"},{l:"Storage Used",v:"2.8 MB",color:"#102A43"}].map(({l,v,color}) => (<div key={l} className="p-4 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-2xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D] mt-1">{l}</div></div>))}</div>
          <div className="space-y-3">{[{cat:"General",count:"23 files",size:"2.8 MB",lastUp:"28 Jul"}].map(({cat,count,size,lastUp}: any) => (<div key={cat} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"#EAF4F0" }}><Folder size={16} style={{ color:"#087F5B" }} /></div><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{cat}</div><div className="text-xs text-[#52606D]">{count} · {size} · Updated: {lastUp}</div></div></div><div className="flex gap-2"><button onClick={() => { setDocUploadForm({ clientId: clients[0]?._raw?.id ?? "", category: "general", file: null }); setActionModal({title: 'Upload File', type: 'upload'}); }}  className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Browse</button><button onClick={() => { setDocUploadForm({ clientId: clients[0]?._raw?.id ?? "", category: "general", file: null }); setActionModal({title: 'Upload File', type: 'upload'}); }}  className="text-xs px-2 py-1 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Upload</button></div></div>))}</div>
        </div>
      );
      case "Audit Workflow": return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#52606D]">{audits.length} audits</div>
            <button onClick={() => { setAuditForm({ clientId: "", serviceId: "", start: "", end: "", type: "statutory", risk: "medium" }); setActionModal({ title: 'Create Audit', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><FileCheck size={13} /> Create Audit</button>
          </div>
          {audits.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No audits yet.</div>}
          {audits.map(({client,type,stage,stageNum,lead,team,due,_raw}: any) => (
            <div key={client+type} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3"><div><div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{client}</div><div className="text-xs text-[#52606D]">{type} · Due: {due}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{stage}</span>{_lc(_raw?.status) !== "completed" && <button onClick={() => advance('audit', { _raw })} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>{_lc(_raw?.status) === "partner_review" ? "Approve" : "Advance →"}</button>}</div></div>
              <div className="flex gap-1 mb-3">{["Planning","Risk Assessment","Field Work","Evidence Review","Reporting","Sign-off"].map((s,i) => (<div key={s} className="flex-1 h-1.5 rounded-full" style={{ background:i<stageNum?"#087F5B":"#E2E8F0" }} />))}</div>
              <div className="flex items-center justify-between text-xs text-[#52606D]">
                <span>Lead: {lead} · Team: {team.join(", ")} · Stage {stageNum}/6</span>
                <span className="flex items-center gap-2">
                  <button onClick={() => { setChecklistForm({ auditId: _raw?.id ?? "", item: "", desc: "" }); setActionModal({ title: 'Add Checklist Item', type: 'form' }); }} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">+ Checklist</button>
                  <button onClick={() => { setObsForm({ auditId: _raw?.id ?? "", title: "", desc: "", risk: "medium" }); setActionModal({ title: 'Add Observation', type: 'form' }); }} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">+ Observation</button>
                  Risk:
                  <select value={_lc(_raw?.risk_rating ?? "medium")} onChange={(e) => setAuditRisk({ _raw }, e.target.value)} className="text-xs border border-[#E2E8F0] rounded-lg px-2 py-1">
                    {["low","medium","high"].map(r => <option key={r} value={r}>{_tc(r)}</option>)}
                  </select>
                </span>
              </div>
            </div>
          ))}
        </div>
      );
      case "Tax-Return Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:String(taxReturns.length),color:"#102A43"},{l:"Filed",v:String(taxReturns.filter((t:any)=>_lc(t.status)==="filed").length),color:"#087F5B"},{l:"In Progress",v:String(taxReturns.filter((t:any)=>_lc(t.status).includes("progress")).length),color:"#C8A45D"},{l:"Pending",v:String(taxReturns.filter((t:any)=>{const s=_lc(t.status);return s!=="filed"&&!s.includes("progress");}).length),color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>))}</div>
          {taxReturns.map(({client,itr,fy,status,ack,date,_raw}: any) => (
            <div key={client} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{client} · {itr}</div><div className="text-xs text-[#52606D]">{fy} · Ack: {ack} · {date}</div></div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="In Progress"?"#FFF4E0":"#FFF0F0",color:status==="Filed"?"#087F5B":status==="In Progress"?"#C8A45D":"#e53e3e" }}>{status}</span><button onClick={() => { setTaxForm({ income: String(_raw?.calculated_taxable_income ?? ""), liability: String(_raw?.calculated_tax_liability ?? ""), refund: String(_raw?.refund_claimed ?? ""), refundStatus: _lc(_raw?.refund_status ?? "pending") }); setActionModal({ title: 'Tax Details', type: 'form', item: { _raw } }); }} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Tax / Refund</button>{_lc(_raw?.status) !== "acknowledgement_received" && <button onClick={() => advance('tax', { _raw })} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Advance →</button>}</div>
            </div>
          ))}
        </div>
      );
      case "GST-Return Tracking": return (
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0]">
            <div className="font-bold text-[#102A43] text-sm mb-2" style={{ fontFamily:"Manrope" }}>Late Fee Calculator</div>
            <div className="flex items-end gap-3 flex-wrap">
              <div><label className="block text-xs text-[#52606D] mb-1">Days late</label><input type="number" min="0" value={lateFee.days} onChange={(e) => setLateFee(p => ({ ...p, days: e.target.value }))} className="w-24 px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" /></div>
              <div><label className="block text-xs text-[#52606D] mb-1">Nil return?</label>
                <select value={lateFee.nil} onChange={(e) => setLateFee(p => ({ ...p, nil: e.target.value }))} className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="no">No</option><option value="yes">Yes</option></select>
              </div>
              <div className="text-sm">Late fee: <span className="font-extrabold text-[#087F5B]">{_money(Math.min(Number(lateFee.days || 0) * (lateFee.nil === "yes" ? 20 : 50), lateFee.nil === "yes" ? 500 : 5000))}</span>
                <span className="text-xs text-[#52606D] ml-2">₹{lateFee.nil === "yes" ? 20 : 50}/day, capped</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:"15",color:"#102A43"},{l:"Filed",v:"8",color:"#087F5B"},{l:"Processing",v:"5",color:"#C8A45D"},{l:"Overdue",v:"2",color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>))}</div>
          {[{client:"TechFlow Solutions",form:"GSTR-3B",period:"July 2026",status:"Processing",arno:"—"},{client:"Nexus Logistics",form:"GSTR-1",period:"July 2026",status:"Overdue",arno:"—"}].map(({client,form,period,status,arno}: any) => (
            <div key={client+form} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{client} · {form}</div><div className="text-xs text-[#52606D]">{period} · ARN: {arno}</div></div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="Overdue"||status==="Due Today"?"#FFF0F0":"#FFF4E0",color:status==="Filed"?"#087F5B":status==="Overdue"||status==="Due Today"?"#e53e3e":"#C8A45D" }}>{status}</span>
                <button className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Advance →</button>
                <button className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Reconcile</button>
              </div>
            </div>
          ))}
        </div>
      );
      case "Invoice Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total",v:_inr(revenue)},{l:"Paid",v:_inr(paidTotal)},{l:"Outstanding",v:_inr(outstanding)}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-white rounded-xl border border-[#E2E8F0] text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>)}</div>
            <button onClick={() => { setInvoiceForm({ clientId: "", due: "", description: "", amount: "" }); setActionModal({title: 'Create Invoice', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ReceiptText size={13} /> Create Invoice</button>
          </div>
          <div className="space-y-3">{invoices.map(({inv,client,svc,amt,date,status,_raw}: any) => (<div key={inv} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{inv} · {client}</div><div className="text-xs text-[#52606D]">{svc} · {date}</div></div><div className="flex items-center gap-3"><div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Paid"?"#EAF4F0":"#FFF0F0",color:status==="Paid"?"#087F5B":"#e53e3e" }}>{status}</span>{status!=="Paid" && <button onClick={() => handleMarkInvoicePaid({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] text-[#102A43]">Mark Paid</button>}</div></div>))}</div>
        </div>
      );
      case "Payment Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 mb-4">{[{l:"Received",v:"₹34.6L",color:"#087F5B"},{l:"Pending",v:"₹8.2L",color:"#e53e3e"},{l:"Transactions",v:"187",color: "white"}].map(({l,v,color}) => (<div key={l} className="p-4 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D] mt-1">{l}</div></div>))}</div>
          {payments.map(({ref,client,inv,amt,method,date,status}: any) => (
            <div key={ref+client} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:status==="Received"?"#EAF4F0":"#FFF0F0" }}><CreditCard size={15} style={{ color:status==="Received"?"#087F5B":"#e53e3e" }} /></div><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{client} · {inv}</div><div className="text-xs text-[#52606D]">{method} · {date}</div></div></div>
              <div className="flex items-center gap-2"><div className="font-bold" style={{ fontFamily:"Manrope",color:status==="Received"?"#087F5B":"#e53e3e" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Received"?"#EAF4F0":"#FFF0F0",color:status==="Received"?"#087F5B":"#e53e3e" }}>{status}</span></div>
            </div>
          ))}
        </div>
      );
      case "Notifications": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2"><div className="text-sm text-[#52606D]">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</div><button onClick={handleMarkAllRead} className="text-xs font-semibold" style={{ color:"#087F5B" }}>Mark all read</button></div>
          {notifications.map(({title,msg,t,type}: any) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background:type==="critical"?"#FFF8F8":"#102A43",borderColor:type==="critical"?"rgba(229,62,62,0.2)":"rgba(0,0,0,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:type==="success"?"#EAF4F0":type==="critical"||type==="warning"?"#FFF0F0":"#EEF1F5" }}>{type==="success"?<CheckCircle size={15} style={{ color:"#087F5B" }} />:type==="critical"?<AlertTriangle size={15} style={{ color:"#e53e3e" }} />:type==="warning"?<Bell size={15} style={{ color:"#C8A45D" }} />:<Info size={15} style={{ color: "white" }} />}</div>
              <div className="flex-1"><div className="font-bold text-sm mb-1" style={{ fontFamily:"Manrope", color: type==="critical"?"#102A43":"#ffffff" }}>{title}</div><p className="text-xs leading-relaxed" style={{ color: type==="critical"?"#52606D":"rgba(255,255,255,0.75)" }}>{msg}</p><div className="text-xs mt-1" style={{ color: type==="critical"?"#52606D":"rgba(255,255,255,0.5)" }}>{t}</div></div>
            </div>
          ))}
        </div>
      );
      case "Reports": return (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{r:"Practice MIS Report",desc:"Monthly overview of all clients, filings, revenue, and staff performance.",tag:"Monthly"},{r:"Client-wise Revenue Report",desc:"Detailed breakdown of revenue by client and service category.",tag:"On Demand"},{r:"Filing Compliance Report",desc:"Status of all filings across all clients for a selected period.",tag:"Monthly"},{r:"Staff Performance Report",desc:"Tasks completed, pending, and overdue per staff member.",tag:"Weekly"},{r:"Outstanding Invoice Report",desc:"All unpaid invoices with aging analysis and client details.",tag:"Weekly"},{r:"Service-wise Profitability",desc:"Revenue vs. cost analysis for each service line.",tag:"Monthly"}].map(({r,desc,tag}) => (
            <div key={r} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{r}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{tag}</span></div>
              <p className="text-xs text-[#52606D] mb-3">{desc}</p>
              <div className="flex gap-2"><button onClick={() => handleDownloadReport(r)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Download size={12} /> Download</button><button onClick={() => setActionModal({title: 'Schedule', type: 'form'})} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EEF1F5",color: "white" }}>Schedule</button></div>
            </div>
          ))}
        </div>
      );
      case "Blog Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#52606D]">{blogs.length} posts</div><button onClick={() => { setBlogForm({ title: "", content: "", summary: "", metaTitle: "", metaDesc: "", status: "draft", publishAt: "" }); setActionModal({title: 'New Blog', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><BookOpen size={13} /> New Post</button></div>
          <div className="space-y-3">{blogs.map(({title,cat,author,date,status,views,_raw}: any) => (<div key={title} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{title}</div><div className="text-xs text-[#52606D]">{cat} · {author} · {date} {views!=="—"?`· ${views} views`:""}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Published"?"#EAF4F0":status==="Scheduled"?"#FFF4E0":"#EEF1F5",color:status==="Published"?"#087F5B":status==="Scheduled"?"#C8A45D":"#52606D" }}>{status}</span><button onClick={() => openEditBlog({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button></div></div>))}</div>
        </div>
      );
      case "Careers Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#52606D]">{careersList.length} positions</div><button onClick={() => { setCareerForm({ job_title: "", department: "", location: "", description: "", requirements: "" }); setActionModal({title: 'New Job', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Post Job</button></div>
          <div className="space-y-3">{careersList.map(({role,type,loc,apps,status,_raw}: any) => (<div key={role} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{role}</div><div className="text-xs text-[#52606D]">{type} · {loc} · {apps} applications</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#102A43",color:status==="Active"?"#087F5B":"#52606D" }}>{status}</span><button onClick={() => handleToggleCareer({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">{_raw?.status === "open" ? "Close" : "Reopen"}</button><button onClick={() => openEditCareer({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button></div></div>))}</div>
        </div>
      );
      case "Website CMS": return (
        <>
        <div className="flex justify-end mb-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white cursor-pointer" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>
            <UploadCloud size={13} /> Media Upload
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              // /documents/upload requires client_id; media is filed against the first client.
              const cid = clients[0]?._raw?.id;
              if (!cid) { showToast('Add a client first — uploads are filed against a client.', 'error'); return; }
              try {
                const form = new FormData(); form.append("file", f); form.append("client_id", cid); form.append("file_category", "general");
                await api.post("/documents/upload", undefined, { form });
                showToast(`Uploaded ${f.name}.`, 'success');
              } catch (err) { showToast(err instanceof ApiError ? err.message : 'Media upload failed.', 'error'); }
            }} />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[{section:"Homepage",items:"Hero, Services Overview, Stats, Testimonials",lastUpdated:"Today",status:"Live"},{section:"Services Pages",items:"10 service pages with pricing & features",lastUpdated:"18 Jul",status:"Live"},{section:"Industries Page",items:"16 industry cards with service details",lastUpdated:"19 Jul",status:"Live"},{section:"About Us",items:"Team, Milestones, Values, Certifications",lastUpdated:"15 Jul",status:"Live"},{section:"Testimonials",items:"12 client testimonials with ratings",lastUpdated:"12 Jul",status:"Live"},{section:"FAQs",items:"24 categorized FAQs",lastUpdated:"10 Jul",status:"Live"},{section:"Contact Page",items:"Form, Map, Office Hours",lastUpdated:"08 Jul",status:"Live"},{section:"Announcement Banner",items:"Rotating announcement ticker",lastUpdated:"Today",status:"Live"}].map(({section,items,lastUpdated,status}) => (
            <div key={section} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{section}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{status}</span></div>
              <p className="text-xs text-[#52606D] mb-3 leading-relaxed">{items}</p>
              <div className="flex items-center justify-between"><span className="text-xs text-[#52606D]">Updated: {lastUpdated}</span><button onClick={() => setActionModal({title: 'Edit Section', type: 'form'})}  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Edit Section</button></div>
            </div>
          ))}
        </div>
        </>
      );
      case "Portal Access Requests": {
        const openRequests = contactRequests.filter((r: any) => !["converted", "closed", "spam"].includes(_lc(r.status)));
        return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#52606D]">{openRequests.length} request{openRequests.length !== 1 ? "s" : ""} from the login page</div>
          </div>
          {openRequests.length === 0 && (
            <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl">No access requests yet.</div>
          )}
          {openRequests.map(({ name, email, phone, service, msg, date, status, _raw }: any) => {
            const reqId = _raw?.id ?? email;
            const busy = busyIds.has(reqId);
            return (
            <div key={reqId} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-bold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{name}</div>
                  <div className="text-xs text-[#52606D]">{email} &middot; {phone} &middot; {date}</div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: status === "new" ? "#FFF4E0" : "#EAF4F0", color: status === "new" ? "#C8A45D" : "#087F5B" }}>{_tc(status)}</span>
              </div>
              {service !== "—" && <div className="text-xs text-[#52606D] mb-1">Service: <span className="text-[#102A43] font-semibold">{service}</span></div>}
              {msg && <p className="text-xs text-[#52606D] mb-3 leading-relaxed line-clamp-2">{msg}</p>}
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusyIds(prev => new Set(prev).add(reqId));
                    try {
                      await api.post("/onboarding/clients", {
                        full_name: name, email, company_name: name, client_type: "private_limited",
                      });
                      try { await requestPasswordReset(email); } catch { /* email best-effort: Supabase rate-limits; account is already created, user can use OTP */ }   // client sets their own password via email
                      if (_raw?.id) await resources.contactRequests.update(_raw.id, { status: "converted" } as any);
                      await loadData();
                      showToast(`Approved — account created for ${email}. They can set a password via email or use OTP.`, "success");
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Could not onboard client. Check if email already exists.", "error");
                    } finally {
                      setBusyIds(prev => { const n = new Set(prev); n.delete(reqId); return n; });
                    }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#087F5B,#065a40)" }}>
                  {busy ? "Onboarding…" : "Onboard as Client"}
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusyIds(prev => new Set(prev).add(reqId));
                    try {
                      if (_raw?.id) await resources.contactRequests.update(_raw.id, { status: "closed" } as any);
                      await loadData();
                      showToast(`Dismissed request from ${name}`, "info");
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Could not dismiss request.", "error");
                    } finally {
                      setBusyIds(prev => { const n = new Set(prev); n.delete(reqId); return n; });
                    }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: "#FFF0F0", color: "#e53e3e" }}>
                  Dismiss
                </button>
              </div>
            </div>
          );})}
        </div>
        );
      }

      case "Lead Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total Leads",v:leads.length},{l:"This Month",v:leads.filter(lead => lead.followUp !== "Done").length},{l:"Converted",v:leads.filter(lead => lead.status === "won").length}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-white rounded-xl border border-[#E2E8F0] text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>)}</div>
            <div className="flex gap-2">
              <button onClick={() => { setReminderForm({ subject: "", body: "", when: "" }); setActionModal({title: 'Set Reminder', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><Bell size={13} /> Reminder</button>
              <button onClick={() => { setLeadFormValues({ name: "", contact: "", email: "", phone: "", source: "Website", service: "", status: "new", followUp: "Today" }); setActionModal({title: 'Add Lead', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Target size={13} /> Add Lead</button>
            </div>
          </div>
          <div className="space-y-3">{leads.map(({name,contact,source,service,status,followUp,_raw}) => (<div key={`${name}-${contact}`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{name} · {contact}</div><div className="text-xs text-[#52606D]">{source} · {service} · Follow-up: {followUp}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="won"?"#EAF4F0":status==="lost"?"#FFF0F0":"#FFF4E0",color:status==="won"?"#087F5B":status==="lost"?"#e53e3e":"#C8A45D" }}>{_tc(status)}</span><button onClick={() => openEditLead(leads.find(x => x._raw?.id === _raw?.id) ?? { _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Update</button>{status !== "won" && status !== "lost" && <button onClick={() => handleConvertLead({ _raw })} className="text-xs px-2 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Convert</button>}</div></div>))}</div>
        </div>
      );
      case "Settings": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#52606D]">{settings.length} settings</div>
            <button onClick={loadSettings} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><RotateCcw size={13} /> Refresh</button>
          </div>
          {settings.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No settings loaded. Click refresh to fetch.</div>}
          <div className="space-y-3">{settings.map((s: any) => (
            <div key={s.key ?? s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex-1"><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{s.key}</div><div className="text-xs text-[#52606D]">{String(s.value ?? "").slice(0, 80)}</div></div>
              <button onClick={() => {
                const v = prompt(`Update ${s.key}:`, String(s.value ?? ""));
                if (v !== null) handleSaveSetting(s.key, v);
              }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Edit</button>
            </div>
          ))}</div>
        </div>
      );
      case "Branch Performance": return (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Main Branch", clients: clients.filter(c => c._raw?.branch_id === clients[0]?._raw?.branch_id || true).length, revenue: _inr(revenue), employees: employees.length, color: "#087F5B", bg: "#EAF4F0" },
              { label: "All Branches", clients: clients.length, revenue: _inr(revenue), employees: employees.length, color: "#C8A45D", bg: "#FFF4E0" },
            ].map(b => (
              <div key={b.label} className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
                <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 rounded-full" style={{ background: b.color }} /><span className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{b.label}</span></div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Clients</span><span className="font-semibold">{b.clients}</span></div>
                  <div className="flex justify-between"><span>Revenue</span><span className="font-semibold">{b.revenue}</span></div>
                  <div className="flex justify-between"><span>Employees</span><span className="font-semibold">{b.employees}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
            <div className="font-bold text-[#102A43] mb-3" style={{ fontFamily:"Manrope" }}>Services by Branch</div>
            {services.length === 0 && <div className="text-sm text-[#52606D] py-4 text-center">No service data.</div>}
            <div className="space-y-3">{services.slice(0, 6).map((s: any) => (
              <div key={s._raw?.id ?? s.svc} className="flex items-center justify-between">
                <span className="text-sm text-[#102A43]">{s.svc}</span>
                <span className="text-xs font-semibold text-[#52606D]">{s.cat} · {s.price}</span>
              </div>
            ))}</div>
          </div>
        </div>
      );
      case "Profit Analysis": return (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: _inr(revenue), color: "#087F5B", bg: "#EAF4F0" },
              { label: "Outstanding", value: _inr(outstanding), color: "#C8A45D", bg: "#FFF4E0" },
              { label: "Collected", value: _inr(paidTotal), color: "#087F5B", bg: "#EAF4F0" },
              { label: "Pending Invoices", value: String(invoices.filter(i => _lc(i.status) !== "paid").length), color: "#e53e3e", bg: "#FFF0F0" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
                <div className="text-xs text-[#52606D] mb-1">{label}</div>
                <div className="text-xl font-extrabold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
            <div className="font-bold text-[#102A43] mb-3" style={{ fontFamily:"Manrope" }}>Revenue vs Outstanding</div>
            {invoiceSplit.length ? (
              <div className="space-y-3">{invoiceSplit.map((d: any) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-sm text-[#102A43]">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (d.value / Math.max(1, revenue)) * 100)}px`, background: d.name === "Paid" ? "#087F5B" : "#C8A45D" }} />
                    <span className="text-xs font-semibold">{_inr(d.value)}</span>
                  </div>
                </div>
              ))}</div>
            ) : <div className="text-sm text-[#52606D] py-4 text-center">No invoice data yet.</div>}
          </div>
        </div>
      );
      case "Payroll": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#52606D]">{payrollRuns.length} payroll runs</div>
            <div className="flex gap-2">
              <button onClick={() => { setAttendanceForm({ employee_id: "", period_month: String(new Date().getMonth()+1), period_year: String(new Date().getFullYear()), days_present: "22", total_days: "30" }); setActionModal({ title: 'Record Attendance', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><CalendarDays size={13} /> Attendance</button>
              <button onClick={() => { setStaffCsv({ clientId: clients[0]?._raw?.id ?? "", csv: "" }); setActionModal({ title: 'Bulk Import Staff', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><UploadCloud size={13} /> Bulk Import</button>
              <button onClick={() => { setPayrollForm({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) }); setActionModal({ title: 'Run Payroll', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Users size={13} /> Run Payroll</button>
            </div>
          </div>
          {payrollProfiles.length > 0 && (
            <div className="mb-6">
              <div className="font-bold text-[#102A43] text-sm mb-2" style={{ fontFamily:"Manrope" }}>Employees on payroll ({payrollProfiles.length})</div>
              <div className="space-y-2">{payrollProfiles.map(({ name, code, salary, _raw }: any) => (
                <div key={_raw?.id ?? code} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0]">
                  <div><span className="font-semibold text-[#102A43] text-sm">{name}</span> <span className="text-xs text-[#52606D]">· {code}</span></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold text-[#102A43]">{salary}</span>
                    <button onClick={() => { setSalaryForm({ salary: String(_raw?.base_salary ?? "") }); setActionModal({ title: 'Revise Salary', type: 'form', item: { _raw } }); }} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Revise</button>
                  </div>
                </div>
              ))}</div>
            </div>
          )}
          {payrollRuns.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No payroll runs yet.</div>}
          <div className="space-y-3">{payrollRuns.map(({period,status,gross,net,_raw}: any) => (
            <div key={_raw?.id ?? period} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>Period {period}</div><div className="text-xs text-[#52606D]">Gross: {gross} · Net: {net}</div></div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Paid"?"#EAF4F0":"#FFF4E0",color:status==="Paid"?"#087F5B":"#C8A45D" }}>{status}</span><button onClick={() => makePdf("Payslip Summary", [`Period: ${period}`, `Gross: ${gross}`, `Net: ${net}`, `Status: ${status}`, "", "Employee-wise breakdown is available in Payroll Reports."], `payslip-${period.replace('/','-')}.pdf`)} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Payslip</button>{_lc(_raw?.status) !== "paid" && <button onClick={() => advancePayroll({ _raw })} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Advance →</button>}</div>
            </div>
          ))}</div>
        </div>
      );
      case "Ledger Accounts": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#52606D]">{ledgerAccounts.length} accounts</div>
            <button onClick={() => { setLedgerForm({ code: "", name: "", type: "asset" }); setActionModal({ title: 'Add Ledger Account', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><_PieChartIcon size={13} /> Add Account</button>
          </div>
          {ledgerAccounts.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No ledger accounts yet.</div>}
          <div className="space-y-3">{ledgerAccounts.map(({code,name,type,balance,_raw}: any) => (
            <div key={_raw?.id ?? code} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{code} · {name}</div><div className="text-xs text-[#52606D]">{type}</div></div>
              <div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{balance}</div>
            </div>
          ))}</div>
        </div>
      );
      case "Vouchers": return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[#52606D]">{vouchers.length} vouchers</div>
            <div className="flex gap-2">
              <button onClick={() => { setTbClientId(clients[0]?._raw?.id ?? ""); setActionModal({ title: 'Trial Balance', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><List size={13} /> Trial Balance</button>
              <button onClick={() => { setBankForm({ clientId: clients[0]?._raw?.id ?? "", csv: "" }); setActionModal({ title: 'Import Bank Statement', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#52606D]"><UploadCloud size={13} /> Bank Import</button>
              <button onClick={() => { setVoucherForm({ date: new Date().toISOString().split('T')[0], description: "", debit_account: "", credit_account: "", amount: "", clientId: clients[0]?._raw?.id ?? "" }); setActionModal({ title: 'Create Voucher', type: 'form' }); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Plus size={13} /> Create Voucher</button>
            </div>
          </div>
          {vouchers.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No vouchers yet.</div>}
          <div className="space-y-3">{vouchers.map(({no,type,date,amount,status,_raw}: any) => (
            <div key={_raw?.id ?? no} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{no} · {type}</div><div className="text-xs text-[#52606D]">{date}</div></div>
              <div className="flex items-center gap-2"><div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{amount}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{status}</span></div>
            </div>
          ))}</div>
          {trialBalance.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="font-bold text-[#102A43] mb-3" style={{ fontFamily:"Manrope" }}>Trial Balance</div>
              <div className="space-y-2">{trialBalance.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#102A43]">{a.account_name ?? a.code ?? `Account ${i+1}`}</span>
                  <span className="font-semibold">{_money(a.balance ?? a.debit ?? a.credit ?? 0)}</span>
                </div>
              ))}</div>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#F7F9FC" }}>
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#E2E8F0] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[#102A43]">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#52606D] hover:text-[#102A43]"><X size={20} /></button>
            </div>
            {actionModal.type === 'upload' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={docUploadForm.clientId} onChange={(e) => setDocUploadForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                  </select>
                </div>
                <label className="block border-2 border-dashed border-[#087F5B]/30 rounded-xl p-8 text-center bg-[#EAF4F0]/50 cursor-pointer hover:bg-[#EAF4F0] transition-colors">
                  <input type="file" className="hidden" onChange={(e) => setDocUploadForm(p => ({ ...p, file: e.target.files?.[0] ?? null }))} />
                  <UploadCloud size={32} className="mx-auto mb-3 text-[#087F5B]" />
                  <p className="text-sm font-semibold text-[#102A43] mb-1">{docUploadForm.file ? docUploadForm.file.name : "Click to browse a file"}</p>
                  <p className="text-xs text-[#52606D]">PDF, XLSX, ZIP (Max. 10MB)</p>
                </label>
              </div>
            ) : (actionModal.title === 'Add Employee' || actionModal.title === 'Edit Employee') ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Employee Name *</label>
                  <input type="text" value={employeeFormValues.name} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter employee name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Role</label>
                  <input type="text" value={employeeFormValues.role} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Staff / Manager / Partner" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Department</label>
                  <input type="text" value={employeeFormValues.dept} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, dept: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="GST / Audit / Payroll" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Email</label>
                  <input type="email" value={employeeFormValues.email} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="employee@finovara.in" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Clients</label>
                    <input type="number" min="0" value={employeeFormValues.clients} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, clients: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Tasks</label>
                    <input type="number" min="0" value={employeeFormValues.tasks} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, tasks: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="1" />
                  </div>
                </div>
              </div>
            ) : (actionModal.title === 'Add Service' || actionModal.title === 'Edit Service') ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Service Name *</label>
                  <input type="text" value={serviceFormValues.svc} onChange={(e) => setServiceFormValues(prev => ({ ...prev, svc: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter service name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Category</label>
                  <input type="text" value={serviceFormValues.cat} onChange={(e) => setServiceFormValues(prev => ({ ...prev, cat: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Direct Tax / GST / Audit" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Price</label>
                  <input type="text" value={serviceFormValues.price} onChange={(e) => setServiceFormValues(prev => ({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="₹2,000–₹15,000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Clients</label>
                    <input type="number" min="0" value={serviceFormValues.clients} onChange={(e) => setServiceFormValues(prev => ({ ...prev, clients: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label>
                    <select value={serviceFormValues.active ? 'Active' : 'Inactive'} onChange={(e) => setServiceFormValues(prev => ({ ...prev, active: e.target.value === 'Active' }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (actionModal.title === 'Assign Task' || actionModal.title === 'Edit Task') ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Task Title *</label>
                  <input type="text" value={taskFormValues.task} onChange={(e) => setTaskFormValues(prev => ({ ...prev, task: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter task title" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                    <select value={taskFormValues.clientId} onChange={(e) => setTaskFormValues(prev => ({ ...prev, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="">Select client…</option>
                      {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Type</label>
                    <select value={taskFormValues.taskType} onChange={(e) => setTaskFormValues(prev => ({ ...prev, taskType: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="general">General</option>
                      <option value="audit">Audit</option>
                      <option value="gst">GST</option>
                      <option value="tax">Tax</option>
                      <option value="payroll">Payroll</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Assignee</label>
                    <input type="text" value={taskFormValues.assignee} onChange={(e) => setTaskFormValues(prev => ({ ...prev, assignee: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Staff name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Due Date</label>
                    <input type="date" value={taskFormValues.due} onChange={(e) => setTaskFormValues(prev => ({ ...prev, due: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Priority</label>
                    <select value={taskFormValues.priority} onChange={(e) => setTaskFormValues(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label>
                    <select value={taskFormValues.status} onChange={(e) => setTaskFormValues(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      {["backlog","todo","in_progress","review","partner_approval","client_approval","done"].map(s => <option key={s} value={s}>{_tc(s)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (actionModal.title === 'Add Lead' || actionModal.title === 'Edit Lead') ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Lead Name *</label>
                  <input type="text" value={leadFormValues.name} onChange={(e) => setLeadFormValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter lead name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Contact Person</label>
                    <input type="text" value={leadFormValues.contact} onChange={(e) => setLeadFormValues(prev => ({ ...prev, contact: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Contact name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Email *</label>
                    <input type="email" value={leadFormValues.email} onChange={(e) => setLeadFormValues(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="lead@company.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Phone *</label>
                  <input type="tel" value={leadFormValues.phone} onChange={(e) => setLeadFormValues(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="9876543210" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Source</label>
                    <select value={leadFormValues.source} onChange={(e) => setLeadFormValues(prev => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Service</label>
                    <input type="text" value={leadFormValues.service} onChange={(e) => setLeadFormValues(prev => ({ ...prev, service: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="GST / Audit" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label>
                    <select value={leadFormValues.status} onChange={(e) => setLeadFormValues(prev => ({ ...prev, status: e.target.value as string }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="consultation_scheduled">Consultation</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Follow-up</label>
                    <input type="text" value={leadFormValues.followUp} onChange={(e) => setLeadFormValues(prev => ({ ...prev, followUp: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Today / 22 Jul" />
                  </div>
                </div>
              </div>
            ) : (actionModal.title === 'Add Client' || actionModal.title === 'Edit Client') ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Client Name *</label>
                  <input type="text" value={formValues.clientName} onChange={(e) => setFormValues(prev => ({ ...prev, clientName: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter client name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Assigned CA</label>
                  <input type="text" value={formValues.caName} onChange={(e) => setFormValues(prev => ({ ...prev, caName: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="CA name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#52606D] mb-1.5">Login Email <span className="text-red-500">*</span></label>
                  <input type="email" value={formValues.email} onChange={(e) => setFormValues(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="client@company.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">PAN</label>
                    <input type="text" value={formValues.pan} maxLength={10} onChange={(e) => { const value = e.target.value.toUpperCase().slice(0, 10); setFormValues(prev => ({ ...prev, pan: value })); setFormErrors(prev => ({ ...prev, pan: undefined })); }} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="AABCT1234A" />
                  {formErrors.pan && <div className="mt-1 text-xs text-[#e53e3e]">{formErrors.pan}</div>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">GSTIN</label>
                    <input type="text" value={formValues.gstin} maxLength={15} onChange={(e) => { const value = e.target.value.toUpperCase().slice(0, 15); setFormValues(prev => ({ ...prev, gstin: value })); setFormErrors(prev => ({ ...prev, gstin: undefined })); }} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="27AABCT1234A1Z5" />
                    {formErrors.gstin && <div className="mt-1 text-xs text-[#e53e3e]">{formErrors.gstin}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Services</label>
                    <input type="number" min="1" value={formValues.services} onChange={(e) => setFormValues(prev => ({ ...prev, services: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="3" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label>
                    <select value={formValues.status} onChange={(e) => setFormValues(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Revise Salary' ? (
              <div className="space-y-4 mb-5 text-left">
                <div className="text-sm text-[#52606D]">{actionModal.item?._raw?.employee_name} · {actionModal.item?._raw?.employee_code}</div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">New Base Salary (₹) *</label><input type="number" min="1" value={salaryForm.salary} onChange={(e) => setSalaryForm({ salary: e.target.value })} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="50000" /></div>
              </div>
            ) : actionModal.title === 'Bulk Import Staff' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={staffCsv.clientId} onChange={(e) => setStaffCsv(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="">Select client…</option>{clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Employees (CSV) *</label>
                  <textarea value={staffCsv.csv} onChange={(e) => setStaffCsv(p => ({ ...p, csv: e.target.value }))} rows={6} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-mono" placeholder={"Asha Rao,EMP001,123456789012,HDFC0001234,55000\nRavi K,EMP002,987654321098,ICIC0005678,42000"} />
                  <div className="text-xs text-[#52606D] mt-1">Format: <span className="font-mono">name,code,account,IFSC,salary</span></div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#087F5B] cursor-pointer">
                  <UploadCloud size={14} /> Load a .csv file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const text = await f.text(); setStaffCsv(p => ({ ...p, csv: text })); } }} />
                </label>
              </div>
            ) : actionModal.title === 'Send Message' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={chatForm.clientId} onChange={(e) => setChatForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="">Select client…</option>{clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Message *</label><textarea value={chatForm.text} onChange={(e) => setChatForm(p => ({ ...p, text: e.target.value }))} rows={4} maxLength={4000} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="Type your message to the client…" /></div>
              </div>
            ) : actionModal.title === 'Import Bank Statement' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={bankForm.clientId} onChange={(e) => setBankForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="">Select client…</option>{clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Statement lines (CSV) *</label>
                  <textarea value={bankForm.csv} onChange={(e) => setBankForm(p => ({ ...p, csv: e.target.value }))} rows={6} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-mono" placeholder={"2026-07-01,NEFT from client,0,25000\n2026-07-03,Bank charges,150,0"} />
                  <div className="text-xs text-[#52606D] mt-1">Format: <span className="font-mono">YYYY-MM-DD,description,debit,credit[,reference]</span> — duplicates are ignored server-side.</div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#087F5B] cursor-pointer">
                  <UploadCloud size={14} /> Load a .csv file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const text = await f.text(); setBankForm(p => ({ ...p, csv: text })); } }} />
                </label>
              </div>
            ) : actionModal.title === 'Set Reminder' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Subject</label><input type="text" value={reminderForm.subject} onChange={(e) => setReminderForm(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="Follow up with client" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Note *</label><textarea value={reminderForm.body} onChange={(e) => setReminderForm(p => ({ ...p, body: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="What to remember" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Remind at</label><input type="datetime-local" value={reminderForm.when} onChange={(e) => setReminderForm(p => ({ ...p, when: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" /></div>
              </div>
            ) : actionModal.title === 'Add Checklist Item' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Item *</label><input type="text" value={checklistForm.item} onChange={(e) => setChecklistForm(p => ({ ...p, item: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="e.g. Verify bank reconciliation" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Description</label><textarea value={checklistForm.desc} onChange={(e) => setChecklistForm(p => ({ ...p, desc: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="Optional detail" /></div>
              </div>
            ) : actionModal.title === 'Add Observation' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Title *</label><input type="text" value={obsForm.title} onChange={(e) => setObsForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="Observation title" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Description *</label><textarea value={obsForm.desc} onChange={(e) => setObsForm(p => ({ ...p, desc: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="What was observed" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Risk Level</label>
                  <select value={obsForm.risk} onChange={(e) => setObsForm(p => ({ ...p, risk: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">{["low","medium","high"].map(r => <option key={r} value={r}>{_tc(r)}</option>)}</select>
                </div>
              </div>
            ) : actionModal.title === 'Create Audit' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={auditForm.clientId} onChange={(e) => setAuditForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="">Select client…</option>{clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Service *</label>
                  <select value={auditForm.serviceId} onChange={(e) => setAuditForm(p => ({ ...p, serviceId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm"><option value="">Select service…</option>{services.map((s) => <option key={s._raw?.id} value={s._raw?.id}>{s.svc}</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Start *</label><input type="date" value={auditForm.start} onChange={(e) => setAuditForm(p => ({ ...p, start: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">End</label><input type="date" value={auditForm.end} onChange={(e) => setAuditForm(p => ({ ...p, end: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Type</label>
                    <select value={auditForm.type} onChange={(e) => setAuditForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">{["statutory","internal","tax","stock","concurrent","process","compliance","management"].map(t => <option key={t} value={t}>{_tc(t)}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Risk</label>
                    <select value={auditForm.risk} onChange={(e) => setAuditForm(p => ({ ...p, risk: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">{["low","medium","high"].map(t => <option key={t} value={t}>{_tc(t)}</option>)}</select>
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Tax Details' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Taxable Income (₹)</label><input type="number" value={taxForm.income} onChange={(e) => setTaxForm(p => ({ ...p, income: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="0" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Tax Liability (₹)</label><input type="number" value={taxForm.liability} onChange={(e) => setTaxForm(p => ({ ...p, liability: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="0" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Refund Claimed (₹)</label><input type="number" value={taxForm.refund} onChange={(e) => setTaxForm(p => ({ ...p, refund: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="0" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Refund Status</label>
                    <select value={taxForm.refundStatus} onChange={(e) => setTaxForm(p => ({ ...p, refundStatus: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">{["pending","received","adjusted"].map(t => <option key={t} value={t}>{_tc(t)}</option>)}</select>
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Run Payroll' ? (
              <div className="space-y-4 mb-5 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Month *</label><input type="number" min="1" max="12" value={payrollForm.month} onChange={(e) => setPayrollForm(p => ({ ...p, month: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Year *</label><input type="number" min="2000" max="2100" value={payrollForm.year} onChange={(e) => setPayrollForm(p => ({ ...p, year: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                </div>
              </div>
            ) : actionModal.title === 'Record Attendance' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Employee *</label>
                  <select value={attendanceForm.employee_id} onChange={(e) => setAttendanceForm(p => ({ ...p, employee_id: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select employee…</option>
                    {employees.map((e) => <option key={e._raw?.id} value={e._raw?.id}>{e.n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Month</label><input type="number" min="1" max="12" value={attendanceForm.period_month} onChange={(e) => setAttendanceForm(p => ({ ...p, period_month: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Year</label><input type="number" min="2000" max="2100" value={attendanceForm.period_year} onChange={(e) => setAttendanceForm(p => ({ ...p, period_year: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Days Present</label><input type="number" min="0" max="31" value={attendanceForm.days_present} onChange={(e) => setAttendanceForm(p => ({ ...p, days_present: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Total Days</label><input type="number" min="0" max="31" value={attendanceForm.total_days} onChange={(e) => setAttendanceForm(p => ({ ...p, total_days: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                </div>
              </div>
            ) : actionModal.title === 'Create Voucher' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={voucherForm.clientId} onChange={(e) => setVoucherForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Date *</label><input type="date" value={voucherForm.date} onChange={(e) => setVoucherForm(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Amount (₹) *</label><input type="number" min="1" value={voucherForm.amount} onChange={(e) => setVoucherForm(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Description *</label><input type="text" value={voucherForm.description} onChange={(e) => setVoucherForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Description of entry" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Debit Account</label><select value={voucherForm.debit_account} onChange={(e) => setVoucherForm(p => ({ ...p, debit_account: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]"><option value="">Select account…</option>{ledgerAccounts.map((a: any) => <option key={a._raw?.id} value={a._raw?.id}>{a.code} · {a.name}</option>)}</select></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Credit Account</label><select value={voucherForm.credit_account} onChange={(e) => setVoucherForm(p => ({ ...p, credit_account: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]"><option value="">Select account…</option>{ledgerAccounts.map((a: any) => <option key={a._raw?.id} value={a._raw?.id}>{a.code} · {a.name}</option>)}</select></div>
                </div>
                <div className="text-xs text-[#52606D]">Debit amount must equal credit amount.</div>
              </div>
            ) : actionModal.title === 'Trial Balance' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={tbClientId} onChange={(e) => setTbClientId(e.target.value)} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                  </select>
                </div>
              </div>
            ) : actionModal.title === 'Schedule Meeting' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Lead *</label>
                  <select value={meetingForm.lead_id} onChange={(e) => setMeetingForm(p => ({ ...p, lead_id: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select lead…</option>
                    {leads.map((l) => <option key={l._raw?.id} value={l._raw?.id}>{l.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Date & Time *</label><input type="datetime-local" value={meetingForm.scheduled_date} onChange={(e) => setMeetingForm(p => ({ ...p, scheduled_date: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Notes</label><textarea value={meetingForm.notes} onChange={(e) => setMeetingForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Meeting notes…" /></div>
              </div>
            ) : actionModal.title === 'Add Ledger Account' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Account Code *</label><input type="text" value={ledgerForm.code} onChange={(e) => setLedgerForm(p => ({ ...p, code: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="1001" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Account Name *</label><input type="text" value={ledgerForm.name} onChange={(e) => setLedgerForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Cash in Hand" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Type</label>
                  <select value={ledgerForm.type} onChange={(e) => setLedgerForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    {["asset","liability","equity","income","expense"].map(t => <option key={t} value={t}>{_tc(t)}</option>)}
                  </select>
                </div>
              </div>
            ) : actionModal.title === 'Raise Query' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={queryForm.clientId} onChange={(e) => setQueryForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Subject *</label><input type="text" value={queryForm.subject} onChange={(e) => setQueryForm(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Query subject" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Details</label><textarea value={queryForm.description} onChange={(e) => setQueryForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Describe the query" /></div>
              </div>
            ) : actionModal.title === 'Create Invoice' ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Client *</label>
                  <select value={invoiceForm.clientId} onChange={(e) => setInvoiceForm(p => ({ ...p, clientId: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c._raw?.id} value={c._raw?.id}>{c.n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Due Date *</label><input type="date" value={invoiceForm.due} onChange={(e) => setInvoiceForm(p => ({ ...p, due: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Amount (₹) *</label><input type="number" min="1" value={invoiceForm.amount} onChange={(e) => setInvoiceForm(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="10000" /></div>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Description</label><input type="text" value={invoiceForm.description} onChange={(e) => setInvoiceForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Professional services" /></div>
                <div className="text-xs text-[#52606D]">18% GST is added automatically.</div>
              </div>
            ) : (actionModal.title === 'New Blog' || actionModal.title === 'Edit Blog') ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Title *</label><input type="text" value={blogForm.title} onChange={(e) => setBlogForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Post title" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Summary</label><input type="text" value={blogForm.summary} onChange={(e) => setBlogForm(p => ({ ...p, summary: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Short summary" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Content *</label><textarea value={blogForm.content} onChange={(e) => setBlogForm(p => ({ ...p, content: e.target.value }))} rows={5} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Write the post…" /></div>
                <div className="pt-1 border-t border-[#E2E8F0]"><div className="text-xs font-bold text-[#52606D] uppercase tracking-wider mb-2 mt-2">SEO &amp; Publishing</div>
                  <div className="space-y-3">
                    <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Meta Title</label><input type="text" maxLength={150} value={blogForm.metaTitle} onChange={(e) => setBlogForm(p => ({ ...p, metaTitle: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="SEO title (max 150)" /></div>
                    <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Meta Description</label><textarea maxLength={255} value={blogForm.metaDesc} onChange={(e) => setBlogForm(p => ({ ...p, metaDesc: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" placeholder="SEO description (max 255)" /></div>
                    {actionModal.title === 'Edit Blog' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label>
                          <select value={blogForm.status} onChange={(e) => setBlogForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm">{["draft","scheduled","published"].map(s => <option key={s} value={s}>{_tc(s)}</option>)}</select>
                        </div>
                        <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Publish At</label><input type="datetime-local" value={blogForm.publishAt} onChange={(e) => setBlogForm(p => ({ ...p, publishAt: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm" /></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (actionModal.title === 'New Job' || actionModal.title === 'Edit Job') ? (
              <div className="space-y-4 mb-5 text-left">
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Job Title *</label><input type="text" value={careerForm.job_title} onChange={(e) => setCareerForm(p => ({ ...p, job_title: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="e.g. Senior Auditor" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Department</label><input type="text" value={careerForm.department} onChange={(e) => setCareerForm(p => ({ ...p, department: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Audit" /></div>
                  <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Location</label><input type="text" value={careerForm.location} onChange={(e) => setCareerForm(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Hyderabad" /></div>
                </div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Description *</label><textarea value={careerForm.description} onChange={(e) => setCareerForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Role description" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Requirements *</label><textarea value={careerForm.requirements} onChange={(e) => setCareerForm(p => ({ ...p, requirements: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Requirements" /></div>
                <div><label className="block text-xs font-semibold text-[#102A43] mb-1">Status</label><select value={careerForm.status} onChange={(e) => setCareerForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B]"><option value="open">Open (accepting applications)</option><option value="closed">Closed</option></select></div>
              </div>
            ) : actionModal.title?.startsWith('Delete') ? (
              <div className="mb-5 text-sm text-[#52606D]">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-[#102A43]">{actionModal.item?.n ?? actionModal.item?.svc ?? actionModal.item?.task ?? "this item"}</span>?
                This action cannot be undone.
              </div>
            ) : (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Name / Title *</label>
                  <input type="text" className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter details..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#102A43] mb-1">Additional Information</label>
                  <textarea className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Optional notes..."></textarea>
                </div>
              </div>
            )}
            <button
              disabled={modalSaving}
              onClick={() => {
                if (modalSaving) return;
                setModalSaving(true);
                if (actionModal?.title === 'Add Client') {
                  handleAddClient();
                  return;
                }
                if (actionModal?.title === 'Add Lead') {
                  handleAddLead();
                  return;
                }
                if (actionModal?.title === 'Add Employee') {
                  handleAddEmployee();
                  return;
                }
                if (actionModal?.title === 'Add Service') {
                  handleAddService();
                  return;
                }
                if (actionModal?.title === 'Assign Task') {
                  handleAddTask();
                  return;
                }
                if (actionModal?.title === 'Edit Client')    { handleUpdateClient(); return; }
                if (actionModal?.title === 'Delete Client')   { handleDeleteClient(); return; }
                if (actionModal?.title === 'Edit Employee')   { handleUpdateEmployee(); return; }
                if (actionModal?.title === 'Delete Employee') { handleDeleteEmployee(); return; }
                if (actionModal?.title === 'Edit Service')    { handleUpdateService(); return; }
                if (actionModal?.title === 'Delete Service')  { handleDeleteService(); return; }
                if (actionModal?.title === 'Edit Task')       { handleUpdateTask(); return; }
                if (actionModal?.title === 'Delete Task')     { handleDeleteTask(); return; }
                if (actionModal?.title === 'Edit Lead')       { handleUpdateLead(); return; }
                if (actionModal?.title === 'New Blog')         { handleAddBlog(); return; }
                if (actionModal?.title === 'Edit Blog')        { handleUpdateBlog(); return; }
                if (actionModal?.title === 'New Job')          { handleAddCareer(); return; }
                if (actionModal?.title === 'Edit Job')         { handleUpdateCareer(); return; }
                if (actionModal?.title === 'Create Invoice')   { handleAddInvoice(); return; }
                if (actionModal?.title === 'Raise Query')      { handleAddQuery(); return; }
                if (actionModal?.title === 'Run Payroll')        { handleRunPayroll(); return; }
                if (actionModal?.title === 'Add Ledger Account')  { handleAddLedger(); return; }
                if (actionModal?.title === 'Create Audit')        { handleAddAudit(); return; }
                if (actionModal?.title === 'Revise Salary')       { handleReviseSalary(); return; }
                if (actionModal?.title === 'Bulk Import Staff')   { handleStaffBulkImport(); return; }
                if (actionModal?.title === 'Send Message')        { handleSendChat(); return; }
                if (actionModal?.title === 'Import Bank Statement') { handleBankImport(); return; }
                if (actionModal?.title === 'Set Reminder')        { handleAddReminder(); return; }
                if (actionModal?.title === 'Add Checklist Item')  { handleAddChecklist(); return; }
                if (actionModal?.title === 'Add Observation')     { handleAddObservation(); return; }
                if (actionModal?.title === 'Tax Details')         { handleSaveTaxDetails(); return; }
                if (actionModal?.title === 'Create Voucher')      { handleAddVoucher(); return; }
                if (actionModal?.title === 'Record Attendance')   { handleAddAttendance(); return; }
                if (actionModal?.title === 'Schedule Meeting')    { handleAddMeeting(); return; }
                if (actionModal?.title === 'Trial Balance')       { loadTrialBalance(); setActionModal(null); return; }
                if (actionModal?.title === 'Upload File')         { handleUploadDocument(); return; }
                showToast(`${actionModal.title} saved successfully!`, 'success');
                setActionModal(null);
              }}
              className="w-full py-3 rounded-xl text-[#102A43] font-semibold text-sm transition-transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {modalSaving ? 'Saving…' : actionModal.type === 'upload' ? 'Confirm Upload' : actionModal.title?.startsWith('Delete') ? 'Delete' : actionModal.title === 'Add Client' ? 'Add Client' : actionModal.title === 'Add Lead' ? 'Add Lead' : actionModal.title === 'Add Employee' ? 'Add Employee' : actionModal.title === 'Add Service' ? 'Add Service' : actionModal.title === 'Assign Task' ? 'Assign Task' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-[#E2E8F0]" style={{ background: "#F7F9FC" }}>
            {toastMessage.type === 'success' && <CheckCircle size={18} style={{ color: "#087F5B" }} />}
            {toastMessage.type === 'info' && <Info size={18} style={{ color: "#3B82F6" }} />}
            {toastMessage.type === 'error' && <AlertCircle size={18} style={{ color: "#e53e3e" }} />}
            <span className="text-sm font-semibold text-[#102A43]" style={{ fontFamily: "Inter" }}>{toastMessage.msg}</span>
          </div>
        </div>
      )}
      {/* Admin Header */}
      <div className="flex-shrink-0 border-b bg-white z-10 relative shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#F7F9FC" }}>
              <span className="text-[#102A43] font-bold text-lg" style={{ fontFamily: "Manrope" }}>A</span>
            </div>
            <div>
              <span className="font-bold text-[#102A43]" style={{ fontFamily: "Manrope" }}>
                {userRole === 'Super Admin' ? 'Finovara Admin' : `Finovara`}
              </span>
              <span className="block text-xs text-[#52606D]" style={{ fontFamily: "Inter" }}>
                {userRole === 'Super Admin' ? 'Practice Management Portal' : `${userRole} Portal`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md" style={{ background: "linear-gradient(135deg, #102A43, #e53e3e)" }}>AM</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-[#52606D] hover:text-[#e53e3e] transition-colors" style={{ fontFamily: "Inter" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col h-full pb-2">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-full overflow-hidden shadow-sm">
              {(() => {
                const r = roles.find(x => x.name === userRole);
                return r ? (
                  <div className="flex-shrink-0 p-5 border-b" style={{ background: "#F7F9FC", borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: r.bg }}>
                        <r.icon size={16} style={{ color: r.color }} />
                      </div>
                      <div>
                        <div className="text-[#102A43] font-bold text-sm" style={{ fontFamily: "Manrope" }}>{r.name}</div>
                        
                      </div>
                    </div>
                    <div className="text-xs text-[#52606D] leading-relaxed" style={{ fontFamily: "Inter" }}>{r.desc}</div>
                  </div>
                ) : null;
              })()}
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

          {/* Mobile Tabs */}
          <div className="lg:hidden w-full flex-shrink-0 mb-4 flex overflow-x-auto gap-2 pb-1">
            {tabs.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => setActiveTab(label)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${activeTab === label ? "text-white shadow-sm" : "bg-white text-[#52606D] border border-[#E2E8F0]"}`}
                style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 h-full pb-2">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col h-full shadow-sm overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-[#102A43]" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
                {userRole && (() => { const r = roles.find(x => x.name === userRole); return r ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: r.bg, color: r.color }}>
                    <r.icon size={11} /> {r.name}
                  </span>
                ) : null; })()}
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
    </div>
  );
}