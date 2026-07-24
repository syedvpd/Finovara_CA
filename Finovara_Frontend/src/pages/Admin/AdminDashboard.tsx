import { useState, useEffect, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  Menu, X, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Mail,
  MapPin, Shield, Clock, FileText, BarChart2, Users, Briefcase, CheckCircle,
  Building2, Globe, Star, Quote, Download, Send, Lock, Bell, Folder,
  TrendingUp, Award, Zap, Calendar, MessageCircle, ExternalLink, Play,
  BookOpen, Search, Filter, Heart, Linkedin, Twitter, Instagram, Youtube,
  Facebook, ChevronLeft, PieChart as PieChartIcon, DollarSign, FileCheck, UserCheck,
  AlertCircle, Info, ArrowUpRight, Target, Layers, Cpu, Lightbulb, Flag,
  CreditCard, ClipboardList, UploadCloud, AlertTriangle, HelpCircle,
  ReceiptText, User2, LogOut
} from "lucide-react";
import { Page } from "../../types/index";
import { useAuth } from "../../context";
import { resources, requestPasswordReset } from "../../services";
import { api } from "../../lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, LabelList } from "recharts";
const _PieChartIcon = PieChartIcon;

// Chart palette — validated for CVD separation; status hues carry meaning
// (paid=emerald, pending=amber, overdue=red) and always ship with labels.
const CHART = { emerald: "#0CA678", amber: "#E8952A", red: "#E5484D", blue: "#4C8DF5", slate: "#64748B" };
const _num = (v: unknown) => Number(v ?? 0) || 0;

// Formatting + safe backend→UI mapping helpers for the admin lists.
const _money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const _date = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
const _tc = (s?: string | null) => s ? s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
const _rowsOf = (r: PromiseSettledResult<any>): any[] => r.status === "fulfilled" ? (r.value?.data ?? r.value ?? []) : [];

type ActionModalState = { title: string; type: 'form'|'upload'; section?: string; item?: any };

export function AdminDashboardPage({ setPage, userRole }: { setPage: (p: Page) => void, userRole: string }) {
  const { logout } = useAuth();
  const handleLogout = async () => { await logout(); setPage("login"); };
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'info'|'error'} | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [blogForm, setBlogForm] = useState({ title: "", content: "", summary: "" });
  const [careerForm, setCareerForm] = useState({ job_title: "", department: "", location: "", description: "", requirements: "" });
  const [invoiceForm, setInvoiceForm] = useState({ clientId: "", due: "", description: "", amount: "" });
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
    status: "Pending",
  });
  const [leadFormValues, setLeadFormValues] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    source: "Website",
    service: "",
    status: "Hot" as 'Hot' | 'Warm' | 'Cold' | 'Converted',
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
  const [queries, setQueries] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
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
        resources.documents.list({ page_size: 200 }),
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
      ]);

      setClients(_rowsOf(r[0]).map((c: any) => {
        const e = c.entities?.[0] ?? {};
        return { n: e.legal_name ?? e.trade_name ?? c.client_code, ca: c.client_type ? _tc(c.client_type) : "—",
          pan: e.pan ?? "—", gstin: e.gstin ?? "—", svc: c.entities?.length ?? 0,
          status: c.status === "active" ? "Active" : "Inactive", _raw: c };
      }));
      setServices(_rowsOf(r[1]).map((s: any) => ({ svc: s.name, cat: _tc(s.department), price: _money(s.base_price), clients: 0, active: true, _raw: s })));
      setEmployees(_rowsOf(r[2]).map((e: any) => ({
        n: e.user ? `${e.user.first_name ?? ""} ${e.user.last_name ?? ""}`.trim() || e.employee_code : e.employee_code,
        role: e.designation, dept: e.department, clients: 0, tasks: 0, email: e.user?.email ?? "—", _raw: e })));
      setTasks(_rowsOf(r[3]).map((t: any) => ({ task: t.title, client: t.client_id?.slice(0, 8) ?? "—", assignee: t.assignments?.[0]?.assignee_name ?? "—",
        due: _date(t.due_date), priority: _tc(t.priority), status: _tc(t.status), _raw: t })));
      setLeads(_rowsOf(r[4]).map((l: any) => ({ name: l.company_name ?? l.name, contact: l.name, source: _tc(l.source),
        service: "—", status: _tc(l.status), followUp: "—", _raw: l })));
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
      setDueTasks(soon.map((t: any) => ({ id: t.id, task: t.title, date: _date(t.due_date), staff: t.assignments?.[0]?.assignee_name ?? "—" })));
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
    } catch {
      showToast("Server rejected the change. Please check the fields and try again.", "error");
    }
  };
  const _slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "svc";
  const _lc = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "_");
  const showToast = (msg: string, type: 'success'|'info'|'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openEditClient = (client: { n: string; ca: string; pan: string; gstin: string; svc: number; status: 'Active' | 'Inactive' }) => {
    setFormValues({
      clientName: client.n,
      caName: client.ca,
      pan: client.pan,
      gstin: client.gstin,
      services: String(client.svc),
      status: client.status,
    });
    setFormErrors({});
    setActionModal({ title: 'Edit Client', type: 'form', section: 'client', item: client });
  };

  const openDeleteClient = (client: { n: string; ca: string; pan: string; gstin: string; svc: number; status: 'Active' | 'Inactive' }) => {
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

  const openEditService = (service: { svc: string; cat: string; price: string; clients: number; active: boolean }) => {
    setServiceFormValues({
      svc: service.svc,
      cat: service.cat,
      price: service.price,
      clients: String(service.clients),
      active: service.active,
    });
    setActionModal({ title: 'Edit Service', type: 'form', section: 'service', item: service });
  };

  const openDeleteService = (service: { svc: string; cat: string; price: string; clients: number; active: boolean }) => {
    setActionModal({ title: 'Delete Service', type: 'form', section: 'service', item: service });
  };

  const openEditTask = (taskItem: { task: string; client: string; assignee: string; due: string; priority: string; status: string }) => {
    setTaskFormValues({
      task: taskItem.task,
      client: taskItem.client,
      assignee: taskItem.assignee,
      due: taskItem.due,
      priority: taskItem.priority,
      status: taskItem.status,
    });
    setActionModal({ title: 'Edit Task', type: 'form', section: 'task', item: taskItem });
  };

  const openDeleteTask = (taskItem: { task: string; client: string; assignee: string; due: string; priority: string; status: string }) => {
    setActionModal({ title: 'Delete Task', type: 'form', section: 'task', item: taskItem });
  };

  const handleReviewDecision = async (item: any, decision: 'approve'|'reject') => {
    const status = decision === 'approve' ? 'approved' : 'rejected';
    if (item.id) {
      try { await resources.documents.update(item.id, { status } as any); }
      catch { showToast('Could not update the document on the server.', 'error'); return; }
    }
    setReviewDocs(prev => prev.filter(d => d.doc !== item.doc));
    showToast(`${decision === 'approve' ? 'Approved' : 'Rejected'} ${item.doc}`, decision === 'approve' ? 'success' : 'error');
  };

  const handleMarkTaskDone = async (item: any) => {
    if (item.id) {
      try { await resources.tasks.update(item.id, { status: 'completed' } as any); }
      catch { showToast('Could not update the task on the server.', 'error'); return; }
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
    const panRegex = /^[A-Z]{5}\d{5}$/;
    const gstinRegex = /^[A-Z0-9]{15}$/;
    const nextErrors: { pan?: string; gstin?: string } = {};

    if (!panRegex.test(pan)) {
      nextErrors.pan = 'PAN must be exactly 10 characters: 5 letters followed by 5 digits.';
    }

    if (!gstinRegex.test(gstin)) {
      nextErrors.gstin = 'GSTIN must be exactly 15 characters.';
    }

    if (nextErrors.pan || nextErrors.gstin) {
      setFormErrors(nextErrors);
      showToast('Please correct the PAN or GSTIN format.', 'error');
      return;
    }

    const id = actionModal?.item?._raw?.id;
    const newStatus = formValues.status === 'Active' ? 'active' : 'inactive';
    setFormValues({ clientName: "", caName: "", email: "", pan: "", gstin: "", services: "3", status: "Active" });
    setFormErrors({});
    if (!id) { setActionModal(null); return; }
    persist(() => resources.clients.update(id, { status: newStatus }), 'Client updated successfully.');
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
    const status = _lc(taskFormValues.status);       // pending|in_progress|completed…
    setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "Pending" });
    if (!id) { setActionModal(null); return; }
    persist(() => resources.tasks.update(id, { title: taskTitle, priority, status } as any), 'Task updated successfully.');
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
    setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "Pending" });
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
    setLeadFormValues({ name: "", contact: "", email: "", phone: "", source: "Website", service: "", status: "Hot", followUp: "Today" });
    persist(() => resources.leads.create(body), 'Lead added successfully.');
  };

  const openEditLead = (item: any) => {
    const l = item._raw ?? {};
    setLeadFormValues({ name: l.company_name ?? l.name ?? "", contact: l.name ?? "", email: l.email ?? "", phone: l.phone ?? "", source: _tc(l.source) || "Website", service: l.notes ?? "", status: _tc(l.status) as any || "Hot", followUp: "Today" });
    setActionModal({ title: 'Edit Lead', type: 'form', section: 'lead', item });
  };

  const handleUpdateLead = () => {
    const id = actionModal?.item?._raw?.id;
    if (!id) { setActionModal(null); return; }
    persist(() => resources.leads.update(id, { company_name: leadFormValues.name.trim(), status: _lc(leadFormValues.status), notes: leadFormValues.service.trim() || undefined } as any), 'Lead updated successfully.');
  };

  const handleConvertLead = async (item: any) => {
    const l = item?._raw ?? {};
    const email = (l.email ?? "").trim().toLowerCase();
    const name = l.company_name ?? l.name ?? "Client";
    if (!email) { showToast('Lead has no email to convert.', 'error'); return; }
    try {
      await api.post("/onboarding/clients", { full_name: name, email, company_name: name, client_type: "private_limited" });
      try { await requestPasswordReset(email); } catch { /* email best-effort */ }
      if (l.id) { try { await resources.leads.update(l.id, { status: "converted" } as any); } catch { /* non-fatal */ } }
      await loadData();
      showToast(`Converted — client account created for ${email}.`, 'success');
    } catch {
      showToast('Could not convert lead. Email may already exist.', 'error');
    }
  };

  const openEditBlog = (item: any) => { const b = item._raw ?? {}; setBlogForm({ title: b.title ?? "", content: b.content ?? "", summary: b.summary ?? "" }); setActionModal({ title: 'Edit Blog', type: 'form', item }); };
  const handleAddBlog = () => {
    const title = blogForm.title.trim(), content = blogForm.content.trim();
    if (!title || !content) { showToast('Title and content are required.', 'error'); return; }
    setBlogForm({ title: "", content: "", summary: "" });
    persist(() => resources.blogs.create({ title, content, summary: blogForm.summary.trim() || undefined } as any), 'Post created.');
  };
  const handleUpdateBlog = () => {
    const id = actionModal?.item?._raw?.id; if (!id) { setActionModal(null); return; }
    persist(() => resources.blogs.update(id, { title: blogForm.title.trim(), content: blogForm.content.trim() || undefined, summary: blogForm.summary.trim() || undefined } as any), 'Post updated.');
  };

  const openEditCareer = (item: any) => { const c = item._raw ?? {}; setCareerForm({ job_title: c.job_title ?? "", department: c.department ?? "", location: c.location ?? "", description: c.description ?? "", requirements: c.requirements ?? "" }); setActionModal({ title: 'Edit Job', type: 'form', item }); };
  const handleAddCareer = () => {
    const { job_title, department, location, description, requirements } = careerForm;
    if (!job_title.trim() || !description.trim() || !requirements.trim()) { showToast('Job title, description and requirements are required.', 'error'); return; }
    setCareerForm({ job_title: "", department: "", location: "", description: "", requirements: "" });
    persist(() => resources.careers.create({ job_title: job_title.trim(), department: department.trim() || "General", location: location.trim() || "Remote", description: description.trim(), requirements: requirements.trim() } as any), 'Job posted.');
  };
  const handleUpdateCareer = () => {
    const id = actionModal?.item?._raw?.id; if (!id) { setActionModal(null); return; }
    persist(() => resources.careers.update(id, { job_title: careerForm.job_title.trim(), description: careerForm.description.trim() || undefined, requirements: careerForm.requirements.trim() || undefined } as any), 'Job updated.');
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
  const handleMarkInvoicePaid = (item: any) => {
    const i = item._raw ?? {};
    const outstanding = Number(i.outstanding_amount ?? i.total_amount ?? 0);
    if (!i.id || outstanding <= 0) { showToast('Nothing outstanding on this invoice.', 'info'); return; }
    persist(() => resources.payments.create({ invoice_id: i.id, amount: String(outstanding), payment_method: 'cash' } as any), 'Payment recorded.');
  };

  const handleMarkAllRead = () => {
    setNotifications([]);
    showToast('All notifications marked as read.', 'success');
  };

  // Role definitions
  const roles = [
    { name: "Super Admin",          desc: "Complete system access",                      color: "#e53e3e", bg: "#FFF0F0", icon: Shield },
    { name: "Managing Partner",     desc: "Firm reports and approvals",                  color: "#087F5B", bg: "#EAF4F0", icon: Star },
    { name: "Chartered Accountant", desc: "Assigned client and professional work",        color: "white", bg: "#EEF1F5", icon: Briefcase },
    { name: "Audit Manager",        desc: "Audit teams and assignments",                  color: "#C8A45D", bg: "#FFF4E0", icon: FileCheck },
    { name: "Tax Manager",          desc: "Tax services and filings",                     color: "#087F5B", bg: "#EAF4F0", icon: FileText },
    { name: "GST Consultant",       desc: "GST clients and returns",                      color: "white", bg: "#EEF1F5", icon: BarChart2 },
    { name: "Partner Accountant",   desc: "Books, reconciliations and reports",           color: "#C8A45D", bg: "#FFF4E0", icon: _PieChartIcon },
    { name: "Payroll Executive",    desc: "Payroll module and professional work",          color: "#087F5B", bg: "#EAF4F0", icon: Users },
    { name: "Relationship Manager", desc: "Client communication assignments",              color: "white", bg: "#EEF1F5", icon: HelpCircle },
    { name: "Accounts Admin",       desc: "Filings, invoices and payments",               color: "#C8A45D", bg: "#FFF4E0", icon: ReceiptText },
    { name: "Content Manager",      desc: "Website content management",                   color: "#e53e3e", bg: "#FFF0F0", icon: Globe },
    { name: "Client",               desc: "Own services, files and reports",              color: "#52606D", bg: "#102A43", icon: UserCheck },
  ];

  const roleTabMap: Record<string, string[]> = {
    "Super Admin":          ["Dashboard","Portal Access Requests","Client Management","Employee Management","Service Management","Task Assignment","Compliance Calendar","Document Management","Audit Workflow","Tax-Return Tracking","GST-Return Tracking","Invoice Management","Payment Tracking","Notifications","Reports","Blog Management","Careers Management","Website CMS","Lead Management","Role-Based Access","Total Clients","Active Services","Pending Filings","Due This Week","Overdue Tasks","Documents Awaiting Review","Open Queries","Monthly Revenue","Outstanding Invoices","Staff Workload","Service-wise Client Count"],
    "Managing Partner":     ["Dashboard","Portal Access Requests","Client Management","Reports","Monthly Revenue","Outstanding Invoices","Payment Tracking","Notifications","Staff Workload","Service-wise Client Count","Lead Management","Employee Management","Service Management"],
    "Chartered Accountant": ["Dashboard","Client Management","Task Assignment","Compliance Calendar","Document Management","Tax-Return Tracking","GST-Return Tracking","Open Queries","Active Services","Pending Filings","Due This Week","Overdue Tasks","Documents Awaiting Review"],
    "Audit Manager":        ["Dashboard","Client Management","Audit Workflow","Document Management","Task Assignment","Compliance Calendar","Documents Awaiting Review","Reports","Staff Workload"],
    "Tax Manager":          ["Dashboard","Client Management","Tax-Return Tracking","Compliance Calendar","Task Assignment","Pending Filings","Due This Week","Overdue Tasks","Document Management","Reports"],
    "GST Consultant":       ["Dashboard","Client Management","GST-Return Tracking","Compliance Calendar","Task Assignment","Document Management","Pending Filings","Due This Week","Overdue Tasks"],
    "Partner Accountant":   ["Dashboard","Client Management","Document Management","Reports","Monthly Revenue","Invoice Management","Payment Tracking"],
    "Payroll Executive":    ["Dashboard","Client Management","Task Assignment","Document Management","Due This Week","Compliance Calendar"],
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
  const overdueTasks = tasks.filter((t) => t._raw?.status !== "completed" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).length;
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

  const kpiCards = [
    { label: "Total Clients",       value: String(clients.length),        change: "live", icon: Users,        color: "#087F5B", bg: "#EAF4F0" },
    { label: "Services",            value: String(services.length),       change: "live", icon: CheckCircle,  color: "#087F5B", bg: "#EAF4F0" },
    { label: "Pending Filings",     value: String(pendingFilings),        change: "live", icon: ClipboardList,color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Overdue Tasks",       value: String(overdueTasks),          change: "live", icon: AlertTriangle,color: "#e53e3e", bg: "#FFF0F0" },
    { label: "Revenue (billed)",    value: _inr(revenue),                 change: "live", icon: TrendingUp,   color: "#087F5B", bg: "#EAF4F0" },
    { label: "Outstanding Invoices",value: _inr(outstanding),             change: "live", icon: ReceiptText,  color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Open Leads",          value: String(leads.length),          change: "live", icon: HelpCircle,   color: "white",   bg: "#EEF1F5" },
    { label: "Docs Awaiting Review",value: String(reviewDocs.length),     change: "live", icon: Folder,       color: "#C8A45D", bg: "#FFF4E0" },
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
              {[
                { a: "ITR filed for Rajesh Mehta", t: "2 min ago", type: "success" },
                { a: "New client onboarded: ABC Corp", t: "1 hr ago", type: "info" },
                { a: "Overdue: GSTR-3B for XYZ Ltd", t: "3 hrs ago", type: "warning" },
                { a: "Invoice INV-2025-0041 paid", t: "5 hrs ago", type: "success" },
                { a: "Document pending: PAN of Sharma & Co", t: "Yesterday", type: "warning" },
              ].map(({ a, t, type }) => (
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
                { label: "Income Tax", done: 82, total: 100 },
                { label: "GST Returns", done: 67, total: 90 },
                { label: "TDS Filings", done: 54, total: 60 },
                { label: "ROC Annual", done: 12, total: 30 },
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
          {[
            { role: "Super Admin",      users: ["CA Arjun Mehta"], perms: ["Full Access", "User Management", "Billing", "Reports", "Audit Logs"], color: "#e53e3e", bg: "#FFF0F0" },
            { role: "Partner",          users: ["CA Priya Nair", "CA Suresh Kumar", "CA Divya Rao"], perms: ["All Clients", "All Services", "Reports", "Assign Staff"], color: "#087F5B", bg: "#EAF4F0" },
            { role: "Senior Manager",   users: ["Rahul S.", "Anita M."], perms: ["Assigned Clients", "File Returns", "Upload Docs", "Close Queries"], color: "#C8A45D", bg: "#FFF4E0" },
            { role: "Staff",            users: ["Kavya R.", "Amit P.", "Sneha K."], perms: ["Assigned Tasks", "Upload Docs", "View Client Data"], color: "white", bg: "#EEF1F5" },
            { role: "Client (View-Only)",users: ["Rajesh Mehta", "TechCorp India"], perms: ["Own Docs", "Own Filings", "Own Invoices"], color: "#52606D", bg: "#102A43" },
          ].map(({ role, users, perms, color, bg }) => (
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
          {dueTasks.map(({ id, task, date, staff }) => (
            <div key={task} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="text-center flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: "#EAF4F0" }}>
                <div className="text-xs font-bold text-[#087F5B]">{date.split(" ")[0]}</div>
                <div className="text-sm font-extrabold text-[#102A43]">{date.split(" ").slice(1).join(" ")}</div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#102A43] text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <div className="text-xs text-[#52606D]">Assigned: {staff}</div>
              </div>
              <button onClick={() => handleMarkTaskDone({ id, task })} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Mark Done</button>
            </div>
          ))}
        </div>
      );

      case "Overdue Tasks": return (
        <div className="space-y-3">
          {tasks.filter((t:any) => t._raw?.status !== "completed" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No overdue tasks.</div>}
          {tasks.filter((t:any) => t._raw?.status !== "completed" && t._raw?.due_date && new Date(t._raw.due_date) < new Date()).map((t:any) => ({
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
                  <button onClick={() => persist(() => resources.queries.update(_raw.id, { status: "resolved" } as any), 'Query resolved.')} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#087F5B,#065a40)" }}>Resolve</button>
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
            <button onClick={() => { setFormValues({ clientName: "", caName: "", email: "", pan: "", gstin: "", services: "3", status: "Active" }); setFormErrors({}); setActionModal({title: 'Add Client', type: 'form'}); }}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Users size={13} /> Add Client</button>
          </div>
          <div className="space-y-3">
            {clients.filter(c => clientFilter === 'All' || c.status === clientFilter).map(({n,ca,pan,gstin,svc,status}) => (
              <div key={n} className="p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n[0]}</div>
                    <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#52606D]">CA: {ca} · {svc} services</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#FFF0F0",color:status==="Active"?"#087F5B":"#e53e3e" }}>{status}</span>
                    <button onClick={() => openEditClient({ n, ca, pan, gstin, svc, status })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                    <button onClick={() => openDeleteClient({ n, ca, pan, gstin, svc, status })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-[#52606D]"><span>PAN: <span className="font-mono font-semibold text-[#102A43]">{pan}</span></span><span>GSTIN: <span className="font-mono font-semibold text-[#102A43]">{gstin}</span></span></div>
              </div>
            ))}
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
            {services.map(({svc,cat,price,clients,active}) => (
              <div key={svc} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
                <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{svc}</div><div className="text-xs text-[#52606D]">{cat} · {price} · {clients} clients</div></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:active?"#EAF4F0":"#102A43",color:active?"#087F5B":"#52606D" }}>{active?"Active":"Inactive"}</span>
                  <button onClick={() => openEditService({ svc, cat, price, clients, active })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                  <button onClick={() => openDeleteService({ svc, cat, price, clients, active })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                  <button onClick={() => setActionModal({title: 'Pricing', type: 'form'})} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Pricing</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Task Assignment": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#52606D]">{tasks.length} open tasks across {new Set(tasks.map(task => task.assignee)).size} staff members</div>
            <button onClick={() => { setTaskFormValues({ task: "", client: "", clientId: "", taskType: "general", assignee: "", due: "", priority: "Medium", status: "Pending" }); setActionModal({title: 'Assign Task', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ClipboardList size={13} /> Assign Task</button>
          </div>
          {tasks.map(({task,client,assignee,due,priority,status}) => (
            <div key={task} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex-1"><div className="font-bold text-[#102A43] text-sm mb-1" style={{ fontFamily:"Manrope" }}>{task}</div><div className="flex gap-3 text-xs text-[#52606D]"><span>Client: {client}</span><span>Assignee: {assignee}</span><span>Due: {due}</span></div></div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0",color:priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="In Progress"?"#EAF4F0":status==="Pending"?"#FFF4E0":"#EEF1F5",color:status==="In Progress"?"#087F5B":status==="Pending"?"#C8A45D":"#52606D" }}>{status}</span>
                <button onClick={() => openEditTask({ task, client, assignee, due, priority, status })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button>
                <button onClick={() => openDeleteTask({ task, client, assignee, due, priority, status })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
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
          <div className="grid grid-cols-3 gap-4 mb-6">{[{l:"Total Docs",v:String(docStats.total),color:"#087F5B"},{l:"Pending Review",v:String(docStats.pending),color:"#C8A45D"},{l:"Storage Used",v:docStats.storage,color:"#102A43"}].map(({l,v,color}) => (<div key={l} className="p-4 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-2xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D] mt-1">{l}</div></div>))}</div>
          {docStats.cats.length === 0 && <div className="text-sm text-[#52606D] py-8 text-center">No documents yet.</div>}
          <div className="space-y-3">{docStats.cats.map(({cat,count,size,lastUp}: any) => (<div key={cat} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"#EAF4F0" }}><Folder size={16} style={{ color:"#087F5B" }} /></div><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{cat}</div><div className="text-xs text-[#52606D]">{count} · {size} · Updated: {lastUp}</div></div></div><div className="flex gap-2"><button onClick={() => setActionModal({title: 'Upload File', type: 'upload'})}  className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Browse</button><button onClick={() => setActionModal({title: 'Upload File', type: 'upload'})}  className="text-xs px-2 py-1 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Upload</button></div></div>))}</div>
        </div>
      );
      case "Audit Workflow": return (
        <div className="space-y-4">
          {audits.map(({client,type,stage,stageNum,lead,team,due}: any) => (
            <div key={client+type} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3"><div><div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{client}</div><div className="text-xs text-[#52606D]">{type} · Due: {due}</div></div><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{stage}</span></div>
              <div className="flex gap-1 mb-3">{["Planning","Risk Assessment","Field Work","Evidence Review","Reporting","Sign-off"].map((s,i) => (<div key={s} className="flex-1 h-1.5 rounded-full" style={{ background:i<stageNum?"#087F5B":"#E2E8F0" }} />))}</div>
              <div className="text-xs text-[#52606D]">Lead: {lead} · Team: {team.join(", ")} · Stage {stageNum}/6</div>
            </div>
          ))}
        </div>
      );
      case "Tax-Return Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:String(taxReturns.length),color:"#102A43"},{l:"Filed",v:String(taxReturns.filter((t:any)=>_lc(t.status)==="filed").length),color:"#087F5B"},{l:"In Progress",v:String(taxReturns.filter((t:any)=>_lc(t.status).includes("progress")).length),color:"#C8A45D"},{l:"Pending",v:String(taxReturns.filter((t:any)=>{const s=_lc(t.status);return s!=="filed"&&!s.includes("progress");}).length),color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>))}</div>
          {taxReturns.map(({client,itr,fy,status,ack,date}: any) => (
            <div key={client} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{client} · {itr}</div><div className="text-xs text-[#52606D]">{fy} · Ack: {ack} · {date}</div></div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="In Progress"?"#FFF4E0":"#FFF0F0",color:status==="Filed"?"#087F5B":status==="In Progress"?"#C8A45D":"#e53e3e" }}>{status}</span>
            </div>
          ))}
        </div>
      );
      case "GST-Return Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:String(gstReturns.length),color:"#102A43"},{l:"Filed",v:String(gstReturns.filter((g:any)=>_lc(g.status)==="filed").length),color:"#087F5B"},{l:"Processing",v:String(gstReturns.filter((g:any)=>_lc(g.status).includes("process")).length),color:"#C8A45D"},{l:"Overdue",v:String(gstReturns.filter((g:any)=>_lc(g.status).includes("overdue")).length),color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-white rounded-2xl border border-[#E2E8F0] text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>))}</div>
          {gstReturns.map(({client,form,period,status,arno}: any) => (
            <div key={client+form} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]">
              <div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{client} · {form}</div><div className="text-xs text-[#52606D]">{period} · ARN: {arno}</div></div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="Overdue"||status==="Due Today"?"#FFF0F0":"#FFF4E0",color:status==="Filed"?"#087F5B":status==="Overdue"||status==="Due Today"?"#e53e3e":"#C8A45D" }}>{status}</span>
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
          <div className="space-y-3">{invoices.map(({inv,client,svc,amt,date,status,_raw}: any) => (<div key={inv} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{inv} · {client}</div><div className="text-xs text-[#52606D]">{svc} · {date}</div></div><div className="flex items-center gap-3"><div className="font-bold text-[#102A43]" style={{ fontFamily:"Manrope" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Paid"?"#EAF4F0":"#FFF0F0",color:status==="Paid"?"#087F5B":"#e53e3e" }}>{status}</span>{status!=="Paid" && <button onClick={() => handleMarkInvoicePaid({ _raw })} className="text-xs px-2 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Mark Paid</button>}</div></div>))}</div>
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
          <div className="flex items-center justify-between mb-2"><div className="text-sm text-[#52606D]">24 unread notifications</div><button onClick={() => showToast('Action completed successfully', 'success')}  className="text-xs font-semibold" style={{ color:"#087F5B" }}>Mark all read</button></div>
          {notifications.map(({title,msg,t,type}: any) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background:type==="critical"?"#FFF8F8":"#102A43",borderColor:type==="critical"?"rgba(229,62,62,0.2)":"rgba(0,0,0,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:type==="success"?"#EAF4F0":type==="critical"||type==="warning"?"#FFF0F0":"#EEF1F5" }}>{type==="success"?<CheckCircle size={15} style={{ color:"#087F5B" }} />:type==="critical"?<AlertTriangle size={15} style={{ color:"#e53e3e" }} />:type==="warning"?<Bell size={15} style={{ color:"#C8A45D" }} />:<Info size={15} style={{ color: "white" }} />}</div>
              <div className="flex-1"><div className="font-bold text-[#102A43] text-sm mb-1" style={{ fontFamily:"Manrope" }}>{title}</div><p className="text-xs text-[#52606D] leading-relaxed">{msg}</p><div className="text-xs text-[#52606D] mt-1">{t}</div></div>
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
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#52606D]">{blogs.length} posts</div><button onClick={() => { setBlogForm({ title: "", content: "", summary: "" }); setActionModal({title: 'New Blog', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><BookOpen size={13} /> New Post</button></div>
          <div className="space-y-3">{blogs.map(({title,cat,author,date,status,views,_raw}: any) => (<div key={title} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{title}</div><div className="text-xs text-[#52606D]">{cat} · {author} · {date} {views!=="—"?`· ${views} views`:""}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Published"?"#EAF4F0":status==="Scheduled"?"#FFF4E0":"#EEF1F5",color:status==="Published"?"#087F5B":status==="Scheduled"?"#C8A45D":"#52606D" }}>{status}</span><button onClick={() => openEditBlog({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button></div></div>))}</div>
        </div>
      );
      case "Careers Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#52606D]">{careersList.length} positions</div><button onClick={() => { setCareerForm({ job_title: "", department: "", location: "", description: "", requirements: "" }); setActionModal({title: 'New Job', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Post Job</button></div>
          <div className="space-y-3">{careersList.map(({role,type,loc,apps,status,_raw}: any) => (<div key={role} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{role}</div><div className="text-xs text-[#52606D]">{type} · {loc} · {apps} applications</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#102A43",color:status==="Active"?"#087F5B":"#52606D" }}>{status}</span><button onClick={() => openEditCareer({ _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Edit</button></div></div>))}</div>
        </div>
      );
      case "Website CMS": return (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{section:"Homepage",items:"Hero, Services Overview, Stats, Testimonials",lastUpdated:"Today",status:"Live"},{section:"Services Pages",items:"10 service pages with pricing & features",lastUpdated:"18 Jul",status:"Live"},{section:"Industries Page",items:"16 industry cards with service details",lastUpdated:"19 Jul",status:"Live"},{section:"About Us",items:"Team, Milestones, Values, Certifications",lastUpdated:"15 Jul",status:"Live"},{section:"Testimonials",items:"12 client testimonials with ratings",lastUpdated:"12 Jul",status:"Live"},{section:"FAQs",items:"24 categorized FAQs",lastUpdated:"10 Jul",status:"Live"},{section:"Contact Page",items:"Form, Map, Office Hours",lastUpdated:"08 Jul",status:"Live"},{section:"Announcement Banner",items:"Rotating announcement ticker",lastUpdated:"Today",status:"Live"}].map(({section,items,lastUpdated,status}) => (
            <div key={section} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{section}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{status}</span></div>
              <p className="text-xs text-[#52606D] mb-3 leading-relaxed">{items}</p>
              <div className="flex items-center justify-between"><span className="text-xs text-[#52606D]">Updated: {lastUpdated}</span><button onClick={() => setActionModal({title: 'Edit Section', type: 'form'})}  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Edit Section</button></div>
            </div>
          ))}
        </div>
      );
      case "Portal Access Requests": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#52606D]">{contactRequests.length} request{contactRequests.length !== 1 ? "s" : ""} from the login page</div>
          </div>
          {contactRequests.length === 0 && (
            <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl">No access requests yet.</div>
          )}
          {contactRequests.map(({ name, email, phone, service, msg, date, status, _raw }: any) => (
            <div key={_raw?.id ?? email} className="p-5 bg-white rounded-2xl border border-[#E2E8F0]">
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
                  onClick={async () => {
                    try {
                      await api.post("/onboarding/clients", {
                        full_name: name, email, company_name: name, client_type: "private_limited",
                      });
                      try { await requestPasswordReset(email); } catch { /* email best-effort: Supabase rate-limits; account is already created, user can use OTP */ }   // client sets their own password via email
                      if (_raw?.id) { try { await resources.contactRequests.update(_raw.id, { status: "converted" } as any); } catch { /* non-fatal */ } }
                      await loadData();
                      showToast(`Approved — account created for ${email}. They can set a password via email or use OTP.`, "success");
                    } catch {
                      showToast("Could not onboard client. Check if email already exists.", "error");
                    }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#087F5B,#065a40)" }}>
                  Onboard as Client
                </button>
                <button
                  onClick={async () => {
                    if (_raw?.id) { try { await resources.contactRequests.update(_raw.id, { status: "dismissed" } as any); await loadData(); } catch { /* non-fatal */ } }
                    showToast(`Dismissed request from ${name}`, "info");
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#FFF0F0", color: "#e53e3e" }}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      );

      case "Lead Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total Leads",v:leads.length},{l:"This Month",v:leads.filter(lead => lead.followUp !== "Done").length},{l:"Converted",v:leads.filter(lead => lead.status === "Converted").length}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-white rounded-xl border border-[#E2E8F0] text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#52606D]">{l}</div></div>)}</div>
            <button onClick={() => { setLeadFormValues({ name: "", contact: "", email: "", phone: "", source: "Website", service: "", status: "Hot", followUp: "Today" }); setActionModal({title: 'Add Lead', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Target size={13} /> Add Lead</button>
          </div>
          <div className="space-y-3">{leads.map(({name,contact,source,service,status,followUp,_raw}) => (<div key={`${name}-${contact}`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0]"><div><div className="font-bold text-[#102A43] text-sm" style={{ fontFamily:"Manrope" }}>{name} · {contact}</div><div className="text-xs text-[#52606D]">{source} · {service} · Follow-up: {followUp}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Hot"?"#FFF0F0":status==="Warm"?"#FFF4E0":status==="Converted"?"#EAF4F0":"#EEF1F5",color:status==="Hot"?"#e53e3e":status==="Warm"?"#C8A45D":status==="Converted"?"#087F5B":"#52606D" }}>{status}</span><button onClick={() => openEditLead(leads.find(x => x._raw?.id === _raw?.id) ?? { _raw })} className="text-xs px-2 py-1 rounded-lg bg-white border border-[#E2E8F0]">Update</button>{status !== "Converted" && <button onClick={() => handleConvertLead({ _raw })} className="text-xs px-2 py-1 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}>Convert</button>}</div></div>))}</div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#F7F9FC" }}>
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#E2E8F0] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[#102A43]">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#52606D] hover:text-[#102A43]"><X size={20} /></button>
            </div>
            {actionModal.type === 'upload' ? (
              <div className="border-2 border-dashed border-[#087F5B]/30 rounded-xl p-8 text-center bg-[#EAF4F0]/50 mb-5 cursor-pointer hover:bg-[#EAF4F0] transition-colors">
                <UploadCloud size={32} className="mx-auto mb-3 text-[#087F5B]" />
                <p className="text-sm font-semibold text-[#102A43] mb-1">Click to browse or drag and drop</p>
                <p className="text-xs text-[#52606D]">PDF, XLSX, ZIP (Max. 10MB)</p>
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
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Not Started">Not Started</option>
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
                    <select value={leadFormValues.status} onChange={(e) => setLeadFormValues(prev => ({ ...prev, status: e.target.value as 'Hot' | 'Warm' | 'Cold' | 'Converted' }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Converted">Converted</option>
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
              onClick={() => {
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
                showToast(`${actionModal.title} saved successfully!`, 'success');
                setActionModal(null);
              }}
              className="w-full py-3 rounded-xl text-[#102A43] font-semibold text-sm transition-transform active:scale-95 flex justify-center items-center gap-2" 
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {actionModal.type === 'upload' ? 'Confirm Upload' : actionModal.title?.startsWith('Delete') ? 'Delete' : actionModal.title === 'Add Client' ? 'Add Client' : actionModal.title === 'Add Lead' ? 'Add Lead' : actionModal.title === 'Add Employee' ? 'Add Employee' : actionModal.title === 'Add Service' ? 'Add Service' : actionModal.title === 'Assign Task' ? 'Assign Task' : 'Save Changes'}
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
                        <div className="text-[#52606D] text-xs" style={{ fontFamily: "Inter" }}>{tabs.length} modules</div>
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