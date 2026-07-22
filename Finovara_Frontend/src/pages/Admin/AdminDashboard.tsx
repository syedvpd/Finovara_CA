import { useState, useEffect, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  Menu, X, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Mail,
  MapPin, Shield, Clock, FileText, BarChart2, Users, Briefcase, CheckCircle,
  Building2, Globe, Star, Quote, Download, Send, Lock, Bell, Folder,
  TrendingUp, Award, Zap, Calendar, MessageCircle, ExternalLink, Play,
  BookOpen, Search, Filter, Heart, Linkedin, Twitter, Instagram, Youtube,
  Facebook, ChevronLeft, PieChart, DollarSign, FileCheck, UserCheck,
  AlertCircle, Info, ArrowUpRight, Target, Layers, Cpu, Lightbulb, Flag,
  CreditCard, ClipboardList, UploadCloud, AlertTriangle, HelpCircle,
  ReceiptText, User2, LogOut
} from "lucide-react";
import { Page } from "../../types/index";
import { useAuth } from "../../context";

type ActionModalState = { title: string; type: 'form'|'upload'; section?: string; item?: any };

export function AdminDashboardPage({ setPage, userRole }: { setPage: (p: Page) => void, userRole: string }) {
  const { logout } = useAuth();
  const handleLogout = async () => { await logout(); setPage("login"); };
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'info'|'error'} | null>(null);
  const [clients, setClients] = useState([
    { n: "TechCorp India Pvt Ltd", ca: "CA Priya Nair", pan: "AABCT1234A", gstin: "27AABCT1234A1Z5", svc: 5, status: "Active" as const },
    { n: "ABC Manufacturing Ltd", ca: "CA Suresh Kumar", pan: "AABCA5678B", gstin: "27AABCA5678B1Z2", svc: 7, status: "Active" as const },
    { n: "Sharma & Co LLP", ca: "CA Divya Rao", pan: "AAGFS9012C", gstin: "06AAGFS9012C1Z8", svc: 2, status: "Active" as const },
    { n: "Green Pharma Pvt Ltd", ca: "CA Priya Nair", pan: "AACCP3456D", gstin: "27AACCP3456D1Z4", svc: 6, status: "Active" as const },
    { n: "Sunrise Retail Ltd", ca: "CA Arjun Mehta", pan: "AADCS7890E", gstin: "07AADCS7890E1Z1", svc: 4, status: "Inactive" as const },
  ]);
  const [services, setServices] = useState([
    { svc: "Income Tax Filing", cat: "Direct Tax", price: "₹2,000–₹15,000", clients: 892, active: true },
    { svc: "GST Return Filing", cat: "Indirect Tax", price: "₹1,500–₹8,000", clients: 743, active: true },
    { svc: "Accounting & Bookkeeping", cat: "Accounting", price: "₹5,000–₹25,000", clients: 521, active: true },
    { svc: "Payroll Management", cat: "HR & Payroll", price: "₹3,000–₹20,000", clients: 389, active: true },
    { svc: "Audit & Assurance", cat: "Audit", price: "₹15,000–₹1,00,000", clients: 267, active: true },
    { svc: "Virtual CFO", cat: "Advisory", price: "₹25,000–₹75,000", clients: 98, active: true },
    { svc: "Startup Advisory", cat: "Advisory", price: "₹10,000–₹50,000", clients: 54, active: true },
    { svc: "Financial Due Diligence", cat: "Audit", price: "₹50,000+", clients: 22, active: false },
  ]);
  const [employees, setEmployees] = useState([
    { n: "CA Priya Nair", role: "Partner", dept: "GST & Indirect Tax", clients: 142, tasks: 8, email: "priya@finovara.in" },
    { n: "CA Suresh Kumar", role: "Partner", dept: "Direct Tax", clients: 118, tasks: 6, email: "suresh@finovara.in" },
    { n: "Rahul Sharma", role: "Senior Manager", dept: "Audit", clients: 45, tasks: 18, email: "rahul@finovara.in" },
    { n: "Kavya Reddy", role: "Staff", dept: "GST", clients: 62, tasks: 22, email: "kavya@finovara.in" },
    { n: "Amit Patel", role: "Staff", dept: "Compliance", clients: 71, tasks: 27, email: "amit@finovara.in" },
    { n: "Sneha Kumar", role: "Staff", dept: "Payroll", clients: 28, tasks: 12, email: "sneha@finovara.in" },
  ]);
  const [tasks, setTasks] = useState([
    { task: "File GSTR-3B – TechCorp India", client: "TechCorp India", assignee: "Kavya R.", due: "20 Jul", priority: "High", status: "In Progress" },
    { task: "Prepare P&L – ABC Mfg FY25", client: "ABC Mfg Ltd", assignee: "Rahul S.", due: "25 Jul", priority: "High", status: "Pending" },
    { task: "Payroll June – Green Pharma", client: "Green Pharma", assignee: "Anita M.", due: "23 Jul", priority: "Medium", status: "In Progress" },
    { task: "Director KYC – Sunrise Retail", client: "Sunrise Retail", assignee: "Amit P.", due: "24 Jul", priority: "Medium", status: "Pending" },
    { task: "File ITR – Rajesh Mehta", client: "Rajesh Mehta", assignee: "Rahul S.", due: "31 Jul", priority: "High", status: "Not Started" },
  ]);
  const [leads, setLeads] = useState([
    { name: "Vikram Industries", contact: "Vikram Shah", source: "Website", service: "GST Advisory", status: "Hot" as const, followUp: "Today" },
    { name: "Priyanka Consultants", contact: "Priyanka R.", source: "Referral", service: "Income Tax", status: "Warm" as const, followUp: "22 Jul" },
    { name: "Metro Constructions", contact: "Anil Sharma", source: "LinkedIn", service: "Audit", status: "Hot" as const, followUp: "Today" },
    { name: "FinStart Pvt Ltd", contact: "CEO", source: "Google Ads", service: "Startup Advisory", status: "Cold" as const, followUp: "28 Jul" },
    { name: "Sunita Kapoor", contact: "Sunita K.", source: "Walk-in", service: "ITR Filing", status: "Converted" as const, followUp: "Done" },
  ]);
  const [formValues, setFormValues] = useState({
    clientName: "",
    caName: "",
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
    assignee: "",
    due: "",
    priority: "Medium",
    status: "Pending",
  });
  const [leadFormValues, setLeadFormValues] = useState({
    name: "",
    contact: "",
    source: "Website",
    service: "",
    status: "Hot" as 'Hot' | 'Warm' | 'Cold' | 'Converted',
    followUp: "Today",
  });
  const [formErrors, setFormErrors] = useState<{ pan?: string; gstin?: string }>({});
  const [reviewDocs, setReviewDocs] = useState([
    { doc: "Form 16 – Rajesh Mehta", client: "Rajesh Mehta", uploaded: "Today", reviewer: "Rahul S." },
    { doc: "Balance Sheet FY24 – ABC Mfg", client: "ABC Mfg Ltd", uploaded: "Yesterday", reviewer: "CA Divya Rao" },
    { doc: "GST Registration – Sharma & Co", client: "Sharma & Co", uploaded: "2 days ago", reviewer: "Kavya R." },
    { doc: "Aadhaar – New Director, Green Pharma", client: "Green Pharma", uploaded: "3 days ago", reviewer: "Amit P." },
    { doc: "Investment Proof – Rajesh Mehta", client: "Rajesh Mehta", uploaded: "3 days ago", reviewer: "Rahul S." },
  ]);
  const [dueTasks, setDueTasks] = useState([
    { task: "GSTR-3B Jun 2025 – TechCorp India", date: "Mon 21 Jul", staff: "Kavya R." },
    { task: "GSTR-3B Jun 2025 – Sharma & Co", date: "Mon 21 Jul", staff: "Kavya R." },
    { task: "TDS Return Q1 – ABC Mfg", date: "Tue 22 Jul", staff: "Rahul S." },
    { task: "Payroll June – Green Pharma", date: "Wed 23 Jul", staff: "Anita M." },
    { task: "Director KYC – Sunrise Retail", date: "Thu 24 Jul", staff: "Amit P." },
    { task: "Advance Tax Installment – Rajesh Mehta", date: "Fri 25 Jul", staff: "Rahul S." },
  ]);
  const [notifications, setNotifications] = useState([
    { title:"GSTR-3B Due Today – 289 clients", msg:"Action required: GSTR-3B for June 2025 is due today for 289 clients.", t:"Just now", type:"critical" },
    { title:"New Client Onboarded", msg:"ABC Trading Co has been successfully onboarded. 5 services activated.", t:"1 hr ago", type:"success" },
    { title:"Payment Received – ₹75,000", msg:"Green Pharma paid Invoice INV-2025-0037.", t:"2 hrs ago", type:"success" },
    { title:"Overdue: ITR – Sharma & Co", msg:"Income Tax Return for Sharma & Co LLP is 1 day overdue.", t:"3 hrs ago", type:"warning" },
    { title:"Staff Alert: Amit P. Over Capacity", msg:"Amit Patel has 27 tasks assigned, exceeding capacity of 25.", t:"5 hrs ago", type:"warning" },
    { title:"Document Uploaded – Review Pending", msg:"Rajesh Mehta uploaded Form 16. Assigned to Rahul S. for review.", t:"Yesterday", type:"info" },
  ]);
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

  const handleReviewDecision = (docName: string, decision: 'approve'|'reject') => {
    setReviewDocs(prev => prev.filter(item => item.doc !== docName));
    showToast(`${decision === 'approve' ? 'Approved' : 'Rejected'} ${docName}`, decision === 'approve' ? 'success' : 'error');
  };

  const handleMarkTaskDone = (taskTitle: string) => {
    setDueTasks(prev => prev.filter(task => task.task !== taskTitle));
    showToast(`Task marked done: ${taskTitle}`, 'success');
  };

  const handleAddClient = () => {
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

    setClients(prev => [{
      n: name,
      ca: formValues.caName.trim() || 'Assigned CA',
      pan,
      gstin,
      svc: Number(formValues.services) || 1,
      status: formValues.status,
    }, ...prev]);
    setFormValues({ clientName: "", caName: "", pan: "", gstin: "", services: "3", status: "Active" });
    setFormErrors({});
    setActionModal(null);
    showToast('Client added successfully.', 'success');
  };

  const handleAddEmployee = () => {
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

    setEmployees(prev => [{
      n: name,
      role: employeeFormValues.role || 'Staff',
      dept: employeeFormValues.dept.trim() || 'General',
      clients: Number(employeeFormValues.clients) || 0,
      tasks: Number(employeeFormValues.tasks) || 0,
      email,
    }, ...prev]);
    setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" });
    setActionModal(null);
    showToast('Employee added successfully.', 'success');
  };

  const handleAddService = () => {
    const name = serviceFormValues.svc.trim();
    if (!name) {
      showToast('Please enter a service name.', 'error');
      return;
    }

    setServices(prev => [{
      svc: name,
      cat: serviceFormValues.cat.trim() || 'General',
      price: serviceFormValues.price.trim() || '₹0',
      clients: Number(serviceFormValues.clients) || 0,
      active: serviceFormValues.active,
    }, ...prev]);
    setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true });
    setActionModal(null);
    showToast('Service added successfully.', 'success');
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

    setClients(prev => prev.map(client => client.pan === actionModal?.item?.pan && client.gstin === actionModal?.item?.gstin ? {
      ...client,
      n: name,
      ca: formValues.caName.trim() || 'Assigned CA',
      pan,
      gstin,
      svc: Number(formValues.services) || 1,
      status: formValues.status,
    } : client));
    setFormValues({ clientName: "", caName: "", pan: "", gstin: "", services: "3", status: "Active" });
    setFormErrors({});
    setActionModal(null);
    showToast('Client updated successfully.', 'success');
  };

  const handleDeleteClient = () => {
    setClients(prev => prev.filter(client => !(client.pan === actionModal?.item?.pan && client.gstin === actionModal?.item?.gstin)));
    setActionModal(null);
    showToast('Client deleted successfully.', 'success');
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

    setEmployees(prev => prev.map(employee => employee.email === actionModal?.item?.email ? {
      ...employee,
      n: name,
      role: employeeFormValues.role || 'Staff',
      dept: employeeFormValues.dept.trim() || 'General',
      clients: Number(employeeFormValues.clients) || 0,
      tasks: Number(employeeFormValues.tasks) || 0,
      email,
    } : employee));
    setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" });
    setActionModal(null);
    showToast('Employee updated successfully.', 'success');
  };

  const handleDeleteEmployee = () => {
    setEmployees(prev => prev.filter(employee => employee.email !== actionModal?.item?.email));
    setActionModal(null);
    showToast('Employee deleted successfully.', 'success');
  };

  const handleUpdateService = () => {
    const name = serviceFormValues.svc.trim();
    if (!name) {
      showToast('Please enter a service name.', 'error');
      return;
    }

    setServices(prev => prev.map(service => service.svc === actionModal?.item?.svc ? {
      ...service,
      svc: name,
      cat: serviceFormValues.cat.trim() || 'General',
      price: serviceFormValues.price.trim() || '₹0',
      clients: Number(serviceFormValues.clients) || 0,
      active: serviceFormValues.active,
    } : service));
    setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true });
    setActionModal(null);
    showToast('Service updated successfully.', 'success');
  };

  const handleDeleteService = () => {
    setServices(prev => prev.filter(service => service.svc !== actionModal?.item?.svc));
    setActionModal(null);
    showToast('Service deleted successfully.', 'success');
  };

  const handleUpdateTask = () => {
    const taskTitle = taskFormValues.task.trim();
    if (!taskTitle) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    setTasks(prev => prev.map(task => task.task === actionModal?.item?.task ? {
      ...task,
      task: taskTitle,
      client: taskFormValues.client.trim() || 'General Client',
      assignee: taskFormValues.assignee.trim() || 'Unassigned',
      due: taskFormValues.due.trim() || 'TBD',
      priority: taskFormValues.priority,
      status: taskFormValues.status,
    } : task));
    setTaskFormValues({ task: "", client: "", assignee: "", due: "", priority: "Medium", status: "Pending" });
    setActionModal(null);
    showToast('Task updated successfully.', 'success');
  };

  const handleDeleteTask = () => {
    setTasks(prev => prev.filter(task => task.task !== actionModal?.item?.task));
    setActionModal(null);
    showToast('Task deleted successfully.', 'success');
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
    if (!taskTitle) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    setTasks(prev => [{
      task: taskTitle,
      client: taskFormValues.client.trim() || 'General Client',
      assignee: taskFormValues.assignee.trim() || 'Unassigned',
      due: taskFormValues.due.trim() || 'TBD',
      priority: taskFormValues.priority,
      status: taskFormValues.status,
    }, ...prev]);
    setTaskFormValues({ task: "", client: "", assignee: "", due: "", priority: "Medium", status: "Pending" });
    setActionModal(null);
    showToast('Task assigned successfully.', 'success');
  };

  const handleAddLead = () => {
    const name = leadFormValues.name.trim();
    const service = leadFormValues.service.trim();
    if (!name || !service) {
      showToast('Please enter a lead name and service.', 'error');
      return;
    }

    setLeads(prev => [{
      name,
      contact: leadFormValues.contact.trim() || 'Contact pending',
      source: leadFormValues.source,
      service,
      status: leadFormValues.status,
      followUp: leadFormValues.followUp,
    }, ...prev]);
    setLeadFormValues({ name: "", contact: "", source: "Website", service: "", status: "Hot", followUp: "Today" });
    setActionModal(null);
    showToast('Lead added successfully.', 'success');
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
    { name: "Partner Accountant",   desc: "Books, reconciliations and reports",           color: "#C8A45D", bg: "#FFF4E0", icon: PieChart },
    { name: "Payroll Executive",    desc: "Payroll module and professional work",          color: "#087F5B", bg: "#EAF4F0", icon: Users },
    { name: "Relationship Manager", desc: "Client communication assignments",              color: "white", bg: "#EEF1F5", icon: HelpCircle },
    { name: "Accounts Admin",       desc: "Filings, invoices and payments",               color: "#C8A45D", bg: "#FFF4E0", icon: ReceiptText },
    { name: "Content Manager",      desc: "Website content management",                   color: "#e53e3e", bg: "#FFF0F0", icon: Globe },
    { name: "Client",               desc: "Own services, files and reports",              color: "#94A3B8", bg: "#102A43", icon: UserCheck },
  ];

  const roleTabMap: Record<string, string[]> = {
    "Super Admin":          ["Dashboard","Client Management","Employee Management","Service Management","Task Assignment","Compliance Calendar","Document Management","Audit Workflow","Tax-Return Tracking","GST-Return Tracking","Invoice Management","Payment Tracking","Notifications","Reports","Blog Management","Careers Management","Website CMS","Lead Management","Role-Based Access","Total Clients","Active Services","Pending Filings","Due This Week","Overdue Tasks","Documents Awaiting Review","Open Queries","Monthly Revenue","Outstanding Invoices","Staff Workload","Service-wise Client Count"],
    "Managing Partner":     ["Dashboard","Client Management","Reports","Monthly Revenue","Outstanding Invoices","Payment Tracking","Notifications","Staff Workload","Service-wise Client Count","Lead Management","Employee Management","Service Management"],
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
    { label: "Reports",                   icon: PieChart },
    { label: "Blog Management",           icon: BookOpen },
    { label: "Careers Management",        icon: Award },
    { label: "Website CMS",               icon: Globe },
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
    { label: "Service-wise Client Count", icon: PieChart },
  ];

  const tabs = allTabDefs.filter(t => (roleTabMap[userRole] || []).includes(t.label));
  
  // Ensure activeTab is valid for this role, else reset to first available
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.label === activeTab)) {
      setActiveTab(tabs[0].label);
    }
  }, [userRole, activeTab, tabs]);

  const kpiCards = [
    { label: "Total Clients",     value: "1,542", change: "+12%",  icon: Users,        color: "#087F5B", bg: "#EAF4F0" },
    { label: "Active Services",   value: "4,218", change: "+8%",   icon: CheckCircle,  color: "#087F5B", bg: "#EAF4F0" },
    { label: "Pending Filings",   value: "87",    change: "-5%",   icon: ClipboardList,color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Overdue Tasks",     value: "14",    change: "+2",    icon: AlertTriangle,color: "#e53e3e", bg: "#FFF0F0" },
    { label: "Monthly Revenue",   value: "₹42L",  change: "+18%",  icon: TrendingUp,   color: "#087F5B", bg: "#EAF4F0" },
    { label: "Outstanding Invoices",value:"₹8.2L", change: "-3%",  icon: ReceiptText,  color: "#C8A45D", bg: "#FFF4E0" },
    { label: "Open Queries",      value: "31",    change: "+4",    icon: HelpCircle,   color: "white", bg: "#EEF1F5" },
    { label: "Docs Awaiting Review",value:"23",   change: "+7",    icon: Folder,       color: "#C8A45D", bg: "#FFF4E0" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard": return (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpiCards.map(({ label, value, change, icon: Icon, color, bg }) => (
              <div key={label} className="bg-[#102A43] rounded-2xl p-5 border border-white/10 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon size={17} style={{ color }} /></div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: bg, color }}>{change}</span>
                </div>
                <div className="text-2xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{value}</div>
                <div className="text-xs text-[#94A3B8] mt-1" style={{ fontFamily: "Inter" }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-[#102A43] rounded-2xl p-5 border border-white/10">
              <div className="font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>Recent Activity</div>
              {[
                { a: "ITR filed for Rajesh Mehta", t: "2 min ago", type: "success" },
                { a: "New client onboarded: ABC Corp", t: "1 hr ago", type: "info" },
                { a: "Overdue: GSTR-3B for XYZ Ltd", t: "3 hrs ago", type: "warning" },
                { a: "Invoice INV-2025-0041 paid", t: "5 hrs ago", type: "success" },
                { a: "Document pending: PAN of Sharma & Co", t: "Yesterday", type: "warning" },
              ].map(({ a, t, type }) => (
                <div key={a} className="flex items-center gap-3 py-2.5 border-t border-white/10">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: type==="success"?"#087F5B":type==="warning"?"#C8A45D":"#102A43" }} />
                  <span className="text-sm text-white flex-1" style={{ fontFamily: "Inter" }}>{a}</span>
                  <span className="text-xs text-[#94A3B8] flex-shrink-0">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#102A43] rounded-2xl p-5 border border-white/10">
              <div className="font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>This Month's Filing Progress</div>
              {[
                { label: "Income Tax", done: 82, total: 100 },
                { label: "GST Returns", done: 67, total: 90 },
                { label: "TDS Filings", done: 54, total: 60 },
                { label: "ROC Annual", done: 12, total: 30 },
              ].map(({ label, done, total }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white" style={{ fontFamily: "Inter" }}>{label}</span>
                    <span className="text-[#94A3B8]">{done}/{total}</span>
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
            { role: "Client (View-Only)",users: ["Rajesh Mehta", "TechCorp India"], perms: ["Own Docs", "Own Filings", "Own Invoices"], color: "#94A3B8", bg: "#102A43" },
          ].map(({ role, users, perms, color, bg }) => (
            <div key={role} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: bg, color }}>{role}</span>
                  <span className="text-xs text-[#94A3B8]">{users.length} user{users.length>1?"s":""}</span>
                </div>
                <button onClick={() => setActionModal({title: 'Edit Permissions', type: 'form'})}  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Edit Permissions</button>
              </div>
              <div className="text-xs text-[#94A3B8] mb-2" style={{ fontFamily: "Inter" }}>Users: {users.join(", ")}</div>
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
            {[["All", "1,542"], ["Active", "1,410"], ["Inactive", "132"]].map(([l,c]) => (
              <div key={l} className="px-4 py-2 rounded-xl bg-[#102A43] border border-white/10 text-sm font-semibold text-white"><span className="text-[#087F5B] font-extrabold mr-1">{c}</span>{l}</div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              { name: "TechCorp India Pvt Ltd",  ca: "CA Priya Nair",    services: 5, status: "Active" },
              { name: "Rajesh Mehta",             ca: "CA Arjun Mehta",   services: 3, status: "Active" },
              { name: "ABC Manufacturing Ltd",   ca: "CA Suresh Kumar",  services: 7, status: "Active" },
              { name: "Sharma & Co LLP",         ca: "CA Divya Rao",     services: 2, status: "Active" },
              { name: "Green Pharma Pvt Ltd",    ca: "CA Priya Nair",    services: 6, status: "Active" },
              { name: "Sunrise Retail Ltd",      ca: "CA Arjun Mehta",   services: 4, status: "Inactive" },
            ].map(({ name, ca, services, status }) => (
              <div key={name} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{name[0]}</div>
                  <div>
                    <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{name}</div>
                    <div className="text-xs text-[#94A3B8]">{ca} · {services} services</div>
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
          {[
            { svc: "Income Tax Filing",     clients: 312, staff: "Rahul S.",     due: "31 Jul", pct: 78 },
            { svc: "GST Return Filing",     clients: 289, staff: "Kavya R.",     due: "20 Jul", pct: 91 },
            { svc: "Payroll Processing",    clients: 145, staff: "Anita M.",     due: "05 Aug", pct: 65 },
            { svc: "Audit & Assurance",     clients: 78,  staff: "CA Divya Rao", due: "30 Sep", pct: 40 },
            { svc: "Virtual CFO",           clients: 54,  staff: "CA Suresh",    due: "Ongoing",pct: 85 },
            { svc: "Company Incorporation", clients: 32,  staff: "Amit P.",      due: "15 Aug", pct: 55 },
          ].map(({ svc, clients, staff, due, pct }) => (
            <div key={svc} className="p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{svc}</div>
                <span className="text-xs font-bold text-[#087F5B]">{clients} clients</span>
              </div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-2"><span>Assigned: {staff}</span><span>Due: {due}</span></div>
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
            { client: "TechCorp India",    filing: "GSTR-3B Jun 2025",       due: "20 Jul 2025", priority: "High" },
            { client: "Sharma & Co LLP",  filing: "ITR-3 FY 2024-25",        due: "31 Jul 2025", priority: "High" },
            { client: "ABC Mfg Ltd",      filing: "TDS Q1 FY 2025-26",       due: "07 Aug 2025", priority: "Medium" },
            { client: "Rajesh Mehta",     filing: "Advance Tax Q2",           due: "15 Sep 2025", priority: "Medium" },
            { client: "Green Pharma",     filing: "ROC Annual Return",        due: "30 Sep 2025", priority: "Low" },
            { client: "Sunrise Retail",   filing: "GST Annual Return FY24",   due: "31 Dec 2025", priority: "Low" },
          ].map(({ client, filing, due, priority }) => (
            <div key={filing+client} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div>
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{filing}</div>
                <div className="text-xs text-[#94A3B8]">{client} · Due: {due}</div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0", color: priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
            </div>
          ))}
        </div>
      );

      case "Due This Week": return (
        <div className="space-y-3">
          {dueTasks.map(({ task, date, staff }) => (
            <div key={task} className="flex items-center gap-4 p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="text-center flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: "#EAF4F0" }}>
                <div className="text-xs font-bold text-[#087F5B]">{date.split(" ")[0]}</div>
                <div className="text-sm font-extrabold text-white">{date.split(" ").slice(1).join(" ")}</div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <div className="text-xs text-[#94A3B8]">Assigned: {staff}</div>
              </div>
              <button onClick={() => handleMarkTaskDone(task)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Mark Done</button>
            </div>
          ))}
        </div>
      );

      case "Overdue Tasks": return (
        <div className="space-y-3">
          {[
            { task: "GSTR-1 May 2025 – Sunrise Retail",     overdue: "5 days", staff: "Kavya R.",  impact: "Penalty Risk" },
            { task: "PF Return May 2025 – ABC Mfg",         overdue: "3 days", staff: "Anita M.", impact: "Interest" },
            { task: "ITR Filing – Sharma & Co LLP",         overdue: "1 day",  staff: "Rahul S.", impact: "Penalty Risk" },
            { task: "Director KYC – Green Pharma",          overdue: "7 days", staff: "Amit P.",  impact: "ROC Notice" },
          ].map(({ task, overdue, staff, impact }) => (
            <div key={task} className="p-4 rounded-2xl border" style={{ background: "#FFF8F8", borderColor: "rgba(229,62,62,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#FFF0F0", color: "#e53e3e" }}>Overdue {overdue}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94A3B8]"><span>Staff: {staff}</span><span className="font-semibold" style={{ color: "#e53e3e" }}>⚠ {impact}</span></div>
            </div>
          ))}
        </div>
      );

      case "Documents Awaiting Review": return (
        <div className="space-y-3">
          {reviewDocs.map(({ doc, client, uploaded, reviewer }) => (
            <div key={doc} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF4E0" }}><Folder size={16} style={{ color: "#C8A45D" }} /></div>
                <div>
                  <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{doc}</div>
                  <div className="text-xs text-[#94A3B8]">{client} · {uploaded} · Reviewer: {reviewer}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleReviewDecision(doc, 'approve')} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "#087F5B" }}>Approve</button>
                <button onClick={() => handleReviewDecision(doc, 'reject')} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#FFF0F0", color: "#e53e3e" }}>Reject</button>
              </div>
            </div>
          ))}
          {reviewDocs.length === 0 && <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl border border-white/10">All documents have been reviewed.</div>}
        </div>
      );

      case "Open Queries": return (
        <div className="space-y-3">
          {[
            { q: "Can TechCorp claim input credit on laptop purchase?", client: "TechCorp India", age: "2 hrs",    staff: "CA Priya",    priority: "High" },
            { q: "Is advance tax applicable for Rajesh Mehta this year?", client: "Rajesh Mehta", age: "1 day",   staff: "Rahul S.",    priority: "Medium" },
            { q: "What is the penalty for late GST filing for ABC Mfg?",  client: "ABC Mfg Ltd", age: "2 days",   staff: "Kavya R.",    priority: "High" },
            { q: "When is the next ROC annual filing for Sharma & Co?",   client: "Sharma & Co", age: "3 days",   staff: "Amit P.",     priority: "Low" },
          ].map(({ q, client, age, staff, priority }) => (
            <div key={q} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{q}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0", color: priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94A3B8]"><span>{client} · {age} ago</span><span>Assigned: {staff}</span></div>
            </div>
          ))}
        </div>
      );

      case "Monthly Revenue": return (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[{ l: "This Month", v: "₹42,80,000", c: "+18%", color: "#087F5B", bg: "#EAF4F0" }, { l: "Last Month", v: "₹36,20,000", c: "", color: "white", bg: "#EEF1F5" }, { l: "Target", v: "₹50,00,000", c: "86%", color: "#C8A45D", bg: "#FFF4E0" }].map(({ l, v, c, color, bg }) => (
              <div key={l} className="p-4 bg-[#102A43] rounded-2xl border border-white/10 text-center">
                <div className="text-xs text-[#94A3B8] mb-1" style={{ fontFamily: "Inter" }}>{l}</div>
                <div className="text-xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{v}</div>
                {c && <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: bg, color }}>{c}</span>}
              </div>
            ))}
          </div>
          <div className="bg-[#102A43] rounded-2xl p-5 border border-white/10 mb-4">
            <div className="font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>Revenue by Service</div>
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
                  <span className="font-medium text-white">{svc}</span>
                  <span className="text-[#94A3B8]">{rev} · {pct}%</span>
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
          {[
            { inv: "INV-2025-0039", client: "Sunrise Retail Ltd",   amt: "₹6,000",  due: "30 Jun 2025", days: "20 days" },
            { inv: "INV-2025-0035", client: "Sharma & Co LLP",      amt: "₹12,000", due: "15 Jun 2025", days: "35 days" },
            { inv: "INV-2025-0031", client: "ABC Mfg Ltd",          amt: "₹45,000", due: "01 Jun 2025", days: "49 days" },
            { inv: "INV-2025-0028", client: "Green Pharma Pvt Ltd", amt: "₹18,500", due: "25 May 2025", days: "56 days" },
          ].map(({ inv, client, amt, due, days }) => (
            <div key={inv} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div>
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{inv} · {client}</div>
                <div className="text-xs text-[#94A3B8]">Due: {due} · <span style={{ color: "#e53e3e" }}>Overdue by {days}</span></div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white" style={{ fontFamily: "Manrope" }}>{amt}</div>
                <button onClick={() => showToast('Reminder sent successfully!', 'success')}  className="text-xs font-semibold mt-1 px-2 py-1 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Send Reminder</button>
              </div>
            </div>
          ))}
        </div>
      );

      case "Staff Workload": return (
        <div className="space-y-4">
          {[
            { name: "Rahul S.",        role: "Senior Manager", tasks: 18, capacity: 20, clients: 45, color: "#087F5B" },
            { name: "Kavya R.",        role: "Staff",          tasks: 22, capacity: 25, clients: 62, color: "#C8A45D" },
            { name: "Anita M.",        role: "Senior Manager", tasks: 15, capacity: 20, clients: 38, color: "#087F5B" },
            { name: "Amit P.",         role: "Staff",          tasks: 27, capacity: 25, clients: 71, color: "#e53e3e" },
            { name: "Sneha K.",        role: "Staff",          tasks: 12, capacity: 25, clients: 28, color: "#087F5B" },
          ].map(({ name, role, tasks, capacity, clients, color }) => (
            <div key={name} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>{name[0]}</div>
                  <div>
                    <div className="font-bold text-white text-sm" style={{ fontFamily: "Manrope" }}>{name}</div>
                    <div className="text-xs text-[#94A3B8]">{role} · {clients} clients</div>
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
            <div key={svc} className="flex items-center gap-4 p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}><PieChart size={15} style={{ color }} /></div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{svc}</span>
                  <span className="text-sm font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{clients}</span>
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
            <div className="flex gap-2">{[`All (${clients.length})`,`Active (${clients.filter(client => client.status === 'Active').length})`,`Inactive (${clients.filter(client => client.status === 'Inactive').length})`].map(t => <button onClick={() => setActionModal({title: 'Create New Entry', type: 'form'})}  key={t} className="px-3 py-1.5 rounded-xl bg-[#102A43] border border-white/10 text-xs font-semibold text-white">{t}</button>)}</div>
            <button onClick={() => { setFormValues({ clientName: "", caName: "", pan: "", gstin: "", services: "3", status: "Active" }); setFormErrors({}); setActionModal({title: 'Add Client', type: 'form'}); }}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Users size={13} /> Add Client</button>
          </div>
          <div className="space-y-3">
            {clients.map(({n,ca,pan,gstin,svc,status}) => (
              <div key={n} className="p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n[0]}</div>
                    <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]">CA: {ca} · {svc} services</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#FFF0F0",color:status==="Active"?"#087F5B":"#e53e3e" }}>{status}</span>
                    <button onClick={() => openEditClient({ n, ca, pan, gstin, svc, status })} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                    <button onClick={() => openDeleteClient({ n, ca, pan, gstin, svc, status })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-[#94A3B8]"><span>PAN: <span className="font-mono font-semibold text-white">{pan}</span></span><span>GSTIN: <span className="font-mono font-semibold text-white">{gstin}</span></span></div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Employee Management": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#94A3B8]">{employees.length} staff members across {new Set(employees.map(employee => employee.role)).size} roles</div>
            <button onClick={() => { setEmployeeFormValues({ name: "", role: "Staff", dept: "", email: "", clients: "2", tasks: "1" }); setActionModal({title: 'Add Employee', type: 'form'}); }}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><UserCheck size={13} /> Add Employee</button>
          </div>
          <div className="space-y-3">
            {employees.map(({n,role,dept,clients,tasks,email}) => (
              <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n.split(" ").map((w:string)=>w[0]).join("")}</div>
                  <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]">{role} · {dept} · {email}</div><div className="text-xs text-[#94A3B8]">{clients} clients · {tasks} tasks</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>Active</span>
                  <button onClick={() => openEditEmployee({ n, role, dept, clients, tasks, email })} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
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
            <div className="text-sm text-[#94A3B8]">{services.filter(service => service.active).length} active services configured</div>
            <button onClick={() => { setServiceFormValues({ svc: "", cat: "", price: "", clients: "10", active: true }); setActionModal({title: 'Add Service', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Add Service</button>
          </div>
          <div className="space-y-3">
            {services.map(({svc,cat,price,clients,active}) => (
              <div key={svc} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{svc}</div><div className="text-xs text-[#94A3B8]">{cat} · {price} · {clients} clients</div></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:active?"#EAF4F0":"#102A43",color:active?"#087F5B":"#52606D" }}>{active?"Active":"Inactive"}</span>
                  <button onClick={() => openEditService({ svc, cat, price, clients, active })} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                  <button onClick={() => openDeleteService({ svc, cat, price, clients, active })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
                  <button onClick={() => setActionModal({title: 'Pricing', type: 'form'})} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Pricing</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Task Assignment": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#94A3B8]">{tasks.length} open tasks across {new Set(tasks.map(task => task.assignee)).size} staff members</div>
            <button onClick={() => { setTaskFormValues({ task: "", client: "", assignee: "", due: "", priority: "Medium", status: "Pending" }); setActionModal({title: 'Assign Task', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ClipboardList size={13} /> Assign Task</button>
          </div>
          {tasks.map(({task,client,assignee,due,priority,status}) => (
            <div key={task} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex-1"><div className="font-bold text-white text-sm mb-1" style={{ fontFamily:"Manrope" }}>{task}</div><div className="flex gap-3 text-xs text-[#94A3B8]"><span>Client: {client}</span><span>Assignee: {assignee}</span><span>Due: {due}</span></div></div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0",color:priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="In Progress"?"#EAF4F0":status==="Pending"?"#FFF4E0":"#EEF1F5",color:status==="In Progress"?"#087F5B":status==="Pending"?"#C8A45D":"#52606D" }}>{status}</span>
                <button onClick={() => openEditTask({ task, client, assignee, due, priority, status })} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                <button onClick={() => openDeleteTask({ task, client, assignee, due, priority, status })} className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      );
      case "Compliance Calendar": return (
        <div>
          <div className="mb-5 p-4 rounded-2xl" style={{ background:"linear-gradient(135deg,#102A43,#0d3355)" }}>
            <div className="font-bold text-white text-lg mb-1" style={{ fontFamily:"Manrope" }}>July 2025 Compliance Deadlines</div>
            <div className="text-white/60 text-xs">18 filings due this month · 4 overdue</div>
          </div>
          <div className="space-y-3">
            {[{date:"20 Jul",filing:"GSTR-3B (Monthly)",clients:"289 clients",owner:"Kavya R.",status:"Due Today",urgency:"critical"},{date:"21 Jul",filing:"GSTR-1 (Monthly)",clients:"289 clients",owner:"Kavya R.",status:"Tomorrow",urgency:"high"},{date:"25 Jul",filing:"Form 16 Distribution",clients:"145 clients",owner:"Rahul S.",status:"5 days left",urgency:"medium"},{date:"31 Jul",filing:"ITR-1/2/3 Filing",clients:"892 clients",owner:"Multiple",status:"11 days left",urgency:"medium"},{date:"07 Aug",filing:"TDS Payment Q1",clients:"312 clients",owner:"Rahul S.",status:"18 days left",urgency:"low"},{date:"30 Sep",filing:"ROC Annual Return",clients:"78 companies",owner:"Amit P.",status:"72 days left",urgency:"low"}].map(({date,filing,clients,owner,status,urgency}) => (
              <div key={filing} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background:urgency==="critical"?"#FFF8F8":"#102A43",borderColor:urgency==="critical"?"rgba(229,62,62,0.2)":"rgba(0,0,0,0.05)" }}>
                <div className="text-center flex-shrink-0 w-14 py-2 rounded-xl" style={{ background:urgency==="critical"?"#FFF0F0":urgency==="high"?"#FFF4E0":"#EAF4F0" }}><div className="text-xs font-bold" style={{ color:urgency==="critical"?"#e53e3e":urgency==="high"?"#C8A45D":"#087F5B" }}>{date}</div></div>
                <div className="flex-1"><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{filing}</div><div className="text-xs text-[#94A3B8]">{clients} · Owner: {owner}</div></div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background:urgency==="critical"?"#FFF0F0":urgency==="high"?"#FFF4E0":"#EAF4F0",color:urgency==="critical"?"#e53e3e":urgency==="high"?"#C8A45D":"#087F5B" }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      );
      case "Document Management": return (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">{[{l:"Total Docs",v:"12,847",color:"#087F5B"},{l:"Pending Review",v:"23",color:"#C8A45D"},{l:"Storage Used",v:"48.2 GB",color: "white"}].map(({l,v,color}) => (<div key={l} className="p-4 bg-[#102A43] rounded-2xl border border-white/10 text-center"><div className="text-2xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#94A3B8] mt-1">{l}</div></div>))}</div>
          <div className="space-y-3">{[{cat:"PAN Documents",count:"3,084 files",size:"2.1 GB",lastUp:"Today"},{cat:"GST Records",count:"4,231 files",size:"8.4 GB",lastUp:"Today"},{cat:"Financial Statements",count:"2,156 files",size:"12.3 GB",lastUp:"Yesterday"},{cat:"Bank Statements",count:"6,842 files",size:"18.7 GB",lastUp:"Today"},{cat:"Audit Evidence",count:"892 files",size:"4.2 GB",lastUp:"2 days ago"},{cat:"Filing Acknowledgements",count:"1,879 files",size:"980 MB",lastUp:"Today"}].map(({cat,count,size,lastUp}) => (<div key={cat} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"#EAF4F0" }}><Folder size={16} style={{ color:"#087F5B" }} /></div><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{cat}</div><div className="text-xs text-[#94A3B8]">{count} · {size} · Updated: {lastUp}</div></div></div><div className="flex gap-2"><button onClick={() => setActionModal({title: 'Upload File', type: 'upload'})}  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Browse</button><button onClick={() => setActionModal({title: 'Upload File', type: 'upload'})}  className="text-xs px-2 py-1 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Upload</button></div></div>))}</div>
        </div>
      );
      case "Audit Workflow": return (
        <div className="space-y-4">
          {[{client:"ABC Manufacturing Ltd",type:"Statutory Audit FY24-25",stage:"Field Work",stageNum:3,lead:"CA Divya Rao",team:["Rahul S.","Sneha K."],due:"30 Sep 2025"},{client:"Green Pharma Pvt Ltd",type:"Tax Audit FY24-25",stage:"Planning",stageNum:1,lead:"CA Suresh Kumar",team:["Kavya R."],due:"30 Sep 2025"},{client:"Sharma & Co LLP",type:"Internal Audit Q1",stage:"Reporting",stageNum:5,lead:"CA Arjun Mehta",team:["Amit P."],due:"31 Jul 2025"}].map(({client,type,stage,stageNum,lead,team,due}) => (
            <div key={client+type} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-3"><div><div className="font-bold text-white" style={{ fontFamily:"Manrope" }}>{client}</div><div className="text-xs text-[#94A3B8]">{type} · Due: {due}</div></div><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{stage}</span></div>
              <div className="flex gap-1 mb-3">{["Planning","Risk Assessment","Field Work","Evidence Review","Reporting","Sign-off"].map((s,i) => (<div key={s} className="flex-1 h-1.5 rounded-full" style={{ background:i<stageNum?"#087F5B":"#E2E8F0" }} />))}</div>
              <div className="text-xs text-[#94A3B8]">Lead: {lead} · Team: {team.join(", ")} · Stage {stageNum}/6</div>
            </div>
          ))}
        </div>
      );
      case "Tax-Return Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:"892",color: "white"},{l:"Filed",v:"734",color:"#087F5B"},{l:"In Progress",v:"124",color:"#C8A45D"},{l:"Pending",v:"34",color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-[#102A43] rounded-2xl border border-white/10 text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#94A3B8]">{l}</div></div>))}</div>
          {[{client:"Rajesh Mehta",itr:"ITR-1",fy:"FY 2024-25",status:"Filed",ack:"AC2025XXXXX",date:"15 Jul"},{client:"TechCorp India",itr:"ITR-6",fy:"FY 2024-25",status:"In Progress",ack:"—",date:"Due 31 Jul"},{client:"Sharma & Co LLP",itr:"ITR-5",fy:"FY 2024-25",status:"Pending",ack:"—",date:"Due 31 Jul"},{client:"Green Pharma",itr:"ITR-6",fy:"FY 2024-25",status:"Filed",ack:"AC2025YYYYY",date:"10 Jul"},{client:"Sunrise Retail",itr:"ITR-6",fy:"FY 2024-25",status:"Pending",ack:"—",date:"Due 31 Jul"}].map(({client,itr,fy,status,ack,date}) => (
            <div key={client} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{client} · {itr}</div><div className="text-xs text-[#94A3B8]">{fy} · Ack: {ack} · {date}</div></div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="In Progress"?"#FFF4E0":"#FFF0F0",color:status==="Filed"?"#087F5B":status==="In Progress"?"#C8A45D":"#e53e3e" }}>{status}</span>
            </div>
          ))}
        </div>
      );
      case "GST-Return Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 mb-4">{[{l:"Total",v:"289",color: "white"},{l:"Filed",v:"251",color:"#087F5B"},{l:"Processing",v:"28",color:"#C8A45D"},{l:"Overdue",v:"10",color:"#e53e3e"}].map(({l,v,color}) => (<div key={l} className="p-3 bg-[#102A43] rounded-2xl border border-white/10 text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#94A3B8]">{l}</div></div>))}</div>
          {[{client:"TechCorp India",form:"GSTR-3B",period:"Jun 2025",status:"Due Today",arno:"—"},{client:"TechCorp India",form:"GSTR-1",period:"Jun 2025",status:"Filed",arno:"ARN2025XXXX"},{client:"ABC Mfg Ltd",form:"GSTR-3B",period:"Jun 2025",status:"Filed",arno:"ARN2025YYYY"},{client:"Sharma & Co",form:"GSTR-3B",period:"Jun 2025",status:"Overdue",arno:"—"},{client:"Green Pharma",form:"GSTR-3B",period:"Jun 2025",status:"Processing",arno:"—"}].map(({client,form,period,status,arno}) => (
            <div key={client+form} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{client} · {form}</div><div className="text-xs text-[#94A3B8]">{period} · ARN: {arno}</div></div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:status==="Filed"?"#EAF4F0":status==="Overdue"||status==="Due Today"?"#FFF0F0":"#FFF4E0",color:status==="Filed"?"#087F5B":status==="Overdue"||status==="Due Today"?"#e53e3e":"#C8A45D" }}>{status}</span>
            </div>
          ))}
        </div>
      );
      case "Invoice Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total",v:"₹42.8L"},{l:"Paid",v:"₹34.6L"},{l:"Outstanding",v:"₹8.2L"}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-[#102A43] rounded-xl border border-white/10 text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#94A3B8]">{l}</div></div>)}</div>
            <button onClick={() => setActionModal({title: 'Create New Entry', type: 'form'})}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ReceiptText size={13} /> Create Invoice</button>
          </div>
          <div className="space-y-3">{[{inv:"INV-2025-0041",client:"TechCorp India",svc:"GST Return Filing",amt:"₹4,500",date:"15 Jul",status:"Paid"},{inv:"INV-2025-0040",client:"Rajesh Mehta",svc:"ITR Filing",amt:"₹8,000",date:"05 Jul",status:"Paid"},{inv:"INV-2025-0039",client:"Sunrise Retail",svc:"Payroll Processing",amt:"₹6,000",date:"30 Jun",status:"Overdue"},{inv:"INV-2025-0038",client:"ABC Mfg",svc:"Virtual CFO Q1",amt:"₹25,000",date:"15 Jun",status:"Overdue"},{inv:"INV-2025-0037",client:"Green Pharma",svc:"Audit FY24-25",amt:"₹75,000",date:"01 Jun",status:"Paid"}].map(({inv,client,svc,amt,date,status}) => (<div key={inv} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{inv} · {client}</div><div className="text-xs text-[#94A3B8]">{svc} · {date}</div></div><div className="flex items-center gap-3"><div className="font-bold text-white" style={{ fontFamily:"Manrope" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Paid"?"#EAF4F0":"#FFF0F0",color:status==="Paid"?"#087F5B":"#e53e3e" }}>{status}</span><button onClick={() => setActionModal({title: 'View', type: 'form'})}  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">View</button></div></div>))}</div>
        </div>
      );
      case "Payment Tracking": return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 mb-4">{[{l:"Received",v:"₹34.6L",color:"#087F5B"},{l:"Pending",v:"₹8.2L",color:"#e53e3e"},{l:"Transactions",v:"187",color: "white"}].map(({l,v,color}) => (<div key={l} className="p-4 bg-[#102A43] rounded-2xl border border-white/10 text-center"><div className="text-xl font-extrabold" style={{ fontFamily:"Manrope",color }}>{v}</div><div className="text-xs text-[#94A3B8] mt-1">{l}</div></div>))}</div>
          {[{ref:"PAY-2025-187",client:"TechCorp India",inv:"INV-0041",amt:"₹4,500",method:"UPI",date:"15 Jul",status:"Received"},{ref:"PAY-2025-186",client:"Rajesh Mehta",inv:"INV-0040",amt:"₹8,000",method:"NEFT",date:"05 Jul",status:"Received"},{ref:"PAY-2025-185",client:"Green Pharma",inv:"INV-0037",amt:"₹75,000",method:"Cheque",date:"02 Jul",status:"Received"},{ref:"PEND-1",client:"Sunrise Retail",inv:"INV-0039",amt:"₹6,000",method:"—",date:"Due 30 Jun",status:"Overdue"},{ref:"PEND-2",client:"ABC Mfg",inv:"INV-0038",amt:"₹25,000",method:"—",date:"Due 15 Jun",status:"Overdue"}].map(({ref,client,inv,amt,method,date,status}) => (
            <div key={ref+client} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:status==="Received"?"#EAF4F0":"#FFF0F0" }}><CreditCard size={15} style={{ color:status==="Received"?"#087F5B":"#e53e3e" }} /></div><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{client} · {inv}</div><div className="text-xs text-[#94A3B8]">{method} · {date}</div></div></div>
              <div className="flex items-center gap-2"><div className="font-bold" style={{ fontFamily:"Manrope",color:status==="Received"?"#087F5B":"#e53e3e" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Received"?"#EAF4F0":"#FFF0F0",color:status==="Received"?"#087F5B":"#e53e3e" }}>{status}</span></div>
            </div>
          ))}
        </div>
      );
      case "Notifications": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2"><div className="text-sm text-[#94A3B8]">24 unread notifications</div><button onClick={() => showToast('Action completed successfully', 'success')}  className="text-xs font-semibold" style={{ color:"#087F5B" }}>Mark all read</button></div>
          {[{title:"GSTR-3B Due Today – 289 clients",msg:"Action required: GSTR-3B for June 2025 is due today for 289 clients.",t:"Just now",type:"critical"},{title:"New Client Onboarded",msg:"ABC Trading Co has been successfully onboarded. 5 services activated.",t:"1 hr ago",type:"success"},{title:"Payment Received – ₹75,000",msg:"Green Pharma paid Invoice INV-2025-0037.",t:"2 hrs ago",type:"success"},{title:"Overdue: ITR – Sharma & Co",msg:"Income Tax Return for Sharma & Co LLP is 1 day overdue.",t:"3 hrs ago",type:"warning"},{title:"Staff Alert: Amit P. Over Capacity",msg:"Amit Patel has 27 tasks assigned, exceeding capacity of 25.",t:"5 hrs ago",type:"warning"},{title:"Document Uploaded – Review Pending",msg:"Rajesh Mehta uploaded Form 16. Assigned to Rahul S. for review.",t:"Yesterday",type:"info"}].map(({title,msg,t,type}) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background:type==="critical"?"#FFF8F8":"#102A43",borderColor:type==="critical"?"rgba(229,62,62,0.2)":"rgba(0,0,0,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:type==="success"?"#EAF4F0":type==="critical"||type==="warning"?"#FFF0F0":"#EEF1F5" }}>{type==="success"?<CheckCircle size={15} style={{ color:"#087F5B" }} />:type==="critical"?<AlertTriangle size={15} style={{ color:"#e53e3e" }} />:type==="warning"?<Bell size={15} style={{ color:"#C8A45D" }} />:<Info size={15} style={{ color: "white" }} />}</div>
              <div className="flex-1"><div className="font-bold text-white text-sm mb-1" style={{ fontFamily:"Manrope" }}>{title}</div><p className="text-xs text-[#94A3B8] leading-relaxed">{msg}</p><div className="text-xs text-[#94A3B8] mt-1">{t}</div></div>
            </div>
          ))}
        </div>
      );
      case "Reports": return (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{r:"Practice MIS Report",desc:"Monthly overview of all clients, filings, revenue, and staff performance.",tag:"Monthly"},{r:"Client-wise Revenue Report",desc:"Detailed breakdown of revenue by client and service category.",tag:"On Demand"},{r:"Filing Compliance Report",desc:"Status of all filings across all clients for a selected period.",tag:"Monthly"},{r:"Staff Performance Report",desc:"Tasks completed, pending, and overdue per staff member.",tag:"Weekly"},{r:"Outstanding Invoice Report",desc:"All unpaid invoices with aging analysis and client details.",tag:"Weekly"},{r:"Service-wise Profitability",desc:"Revenue vs. cost analysis for each service line.",tag:"Monthly"}].map(({r,desc,tag}) => (
            <div key={r} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{r}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{tag}</span></div>
              <p className="text-xs text-[#94A3B8] mb-3">{desc}</p>
              <div className="flex gap-2"><button onClick={() => handleDownloadReport(r)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Download size={12} /> Download</button><button onClick={() => setActionModal({title: 'Schedule', type: 'form'})} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EEF1F5",color: "white" }}>Schedule</button></div>
            </div>
          ))}
        </div>
      );
      case "Blog Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#94A3B8]">18 published · 4 drafts · 2 scheduled</div><button onClick={() => setActionModal({title: 'Create New Entry', type: 'form'})}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><BookOpen size={13} /> New Post</button></div>
          <div className="space-y-3">{[{title:"Budget 2025: Key Changes for SMEs",cat:"Tax",author:"CA Arjun Mehta",date:"18 Jul 2025",status:"Published",views:"1,240"},{title:"GST Annual Return FY24: Complete Guide",cat:"GST",author:"CA Priya Nair",date:"15 Jul 2025",status:"Published",views:"2,108"},{title:"How to Choose the Right ITR Form",cat:"Income Tax",author:"Rahul S.",date:"—",status:"Draft",views:"—"},{title:"ESOP Taxation for Startup Employees",cat:"Startup",author:"CA Suresh Kumar",date:"25 Jul 2025",status:"Scheduled",views:"—"},{title:"Director KYC: Step-by-Step Process",cat:"Corporate",author:"Amit P.",date:"10 Jul 2025",status:"Published",views:"876"}].map(({title,cat,author,date,status,views}) => (<div key={title} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{title}</div><div className="text-xs text-[#94A3B8]">{cat} · {author} · {date} {views!=="—"?`· ${views} views`:""}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Published"?"#EAF4F0":status==="Scheduled"?"#FFF4E0":"#EEF1F5",color:status==="Published"?"#087F5B":status==="Scheduled"?"#C8A45D":"#52606D" }}>{status}</span><button onClick={() => setActionModal({title: 'Edit', type: 'form'})}  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button></div></div>))}</div>
        </div>
      );
      case "Careers Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#94A3B8]">5 open positions · 48 total applications</div><button onClick={() => setActionModal({title: 'Create New Entry', type: 'form'})}  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Post Job</button></div>
          <div className="space-y-3">{[{role:"Senior CA – Audit & Assurance",type:"Full-time",loc:"Hyderabad",apps:14,status:"Active"},{role:"GST Consultant",type:"Full-time",loc:"Hyderabad / Remote",apps:22,status:"Active"},{role:"Payroll Executive",type:"Full-time",loc:"Bengaluru",apps:8,status:"Active"},{role:"Article Assistant (CA)",type:"Internship",loc:"Hyderabad",apps:31,status:"Active"},{role:"Virtual CFO – Part Time",type:"Part-time",loc:"Remote",apps:5,status:"Closed"}].map(({role,type,loc,apps,status}) => (<div key={role} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{role}</div><div className="text-xs text-[#94A3B8]">{type} · {loc} · {apps} applications</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#102A43",color:status==="Active"?"#087F5B":"#52606D" }}>{status}</span><button onClick={() => setActionModal({title: 'View Apps', type: 'form'})}  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">View Apps</button><button onClick={() => setActionModal({title: 'Edit', type: 'form'})}  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button></div></div>))}</div>
        </div>
      );
      case "Website CMS": return (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{section:"Homepage",items:"Hero, Services Overview, Stats, Testimonials",lastUpdated:"Today",status:"Live"},{section:"Services Pages",items:"10 service pages with pricing & features",lastUpdated:"18 Jul",status:"Live"},{section:"Industries Page",items:"16 industry cards with service details",lastUpdated:"19 Jul",status:"Live"},{section:"About Us",items:"Team, Milestones, Values, Certifications",lastUpdated:"15 Jul",status:"Live"},{section:"Testimonials",items:"12 client testimonials with ratings",lastUpdated:"12 Jul",status:"Live"},{section:"FAQs",items:"24 categorized FAQs",lastUpdated:"10 Jul",status:"Live"},{section:"Contact Page",items:"Form, Map, Office Hours",lastUpdated:"08 Jul",status:"Live"},{section:"Announcement Banner",items:"Rotating announcement ticker",lastUpdated:"Today",status:"Live"}].map(({section,items,lastUpdated,status}) => (
            <div key={section} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{section}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{status}</span></div>
              <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">{items}</p>
              <div className="flex items-center justify-between"><span className="text-xs text-[#94A3B8]">Updated: {lastUpdated}</span><button onClick={() => setActionModal({title: 'Edit Section', type: 'form'})}  className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Edit Section</button></div>
            </div>
          ))}
        </div>
      );
      case "Lead Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total Leads",v:leads.length},{l:"This Month",v:leads.filter(lead => lead.followUp !== "Done").length},{l:"Converted",v:leads.filter(lead => lead.status === "Converted").length}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-[#102A43] rounded-xl border border-white/10 text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#94A3B8]">{l}</div></div>)}</div>
            <button onClick={() => { setLeadFormValues({ name: "", contact: "", source: "Website", service: "", status: "Hot", followUp: "Today" }); setActionModal({title: 'Add Lead', type: 'form'}); }} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Target size={13} /> Add Lead</button>
          </div>
          <div className="space-y-3">{leads.map(({name,contact,source,service,status,followUp}) => (<div key={`${name}-${contact}`} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{name} · {contact}</div><div className="text-xs text-[#94A3B8]">{source} · {service} · Follow-up: {followUp}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Hot"?"#FFF0F0":status==="Warm"?"#FFF4E0":status==="Converted"?"#EAF4F0":"#EEF1F5",color:status==="Hot"?"#e53e3e":status==="Warm"?"#C8A45D":status==="Converted"?"#087F5B":"#52606D" }}>{status}</span><button onClick={() => setActionModal({title: 'Update', type: 'form'})} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Update</button></div></div>))}</div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#102A43" }}>
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/5 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#94A3B8] hover:text-white"><X size={20} /></button>
            </div>
            {actionModal.type === 'upload' ? (
              <div className="border-2 border-dashed border-[#087F5B]/30 rounded-xl p-8 text-center bg-[#EAF4F0]/50 mb-5 cursor-pointer hover:bg-[#EAF4F0] transition-colors">
                <UploadCloud size={32} className="mx-auto mb-3 text-[#087F5B]" />
                <p className="text-sm font-semibold text-white mb-1">Click to browse or drag and drop</p>
                <p className="text-xs text-[#94A3B8]">PDF, XLSX, ZIP (Max. 10MB)</p>
              </div>
            ) : actionModal.title === 'Add Employee' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Employee Name *</label>
                  <input type="text" value={employeeFormValues.name} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter employee name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Role</label>
                  <input type="text" value={employeeFormValues.role} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Staff / Manager / Partner" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Department</label>
                  <input type="text" value={employeeFormValues.dept} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, dept: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="GST / Audit / Payroll" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Email</label>
                  <input type="email" value={employeeFormValues.email} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="employee@finovara.in" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Clients</label>
                    <input type="number" min="0" value={employeeFormValues.clients} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, clients: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Tasks</label>
                    <input type="number" min="0" value={employeeFormValues.tasks} onChange={(e) => setEmployeeFormValues(prev => ({ ...prev, tasks: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="1" />
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Add Service' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Service Name *</label>
                  <input type="text" value={serviceFormValues.svc} onChange={(e) => setServiceFormValues(prev => ({ ...prev, svc: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter service name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Category</label>
                  <input type="text" value={serviceFormValues.cat} onChange={(e) => setServiceFormValues(prev => ({ ...prev, cat: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Direct Tax / GST / Audit" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Price</label>
                  <input type="text" value={serviceFormValues.price} onChange={(e) => setServiceFormValues(prev => ({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="₹2,000–₹15,000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Clients</label>
                    <input type="number" min="0" value={serviceFormValues.clients} onChange={(e) => setServiceFormValues(prev => ({ ...prev, clients: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Status</label>
                    <select value={serviceFormValues.active ? 'Active' : 'Inactive'} onChange={(e) => setServiceFormValues(prev => ({ ...prev, active: e.target.value === 'Active' }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Assign Task' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Task Title *</label>
                  <input type="text" value={taskFormValues.task} onChange={(e) => setTaskFormValues(prev => ({ ...prev, task: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter task title" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Client</label>
                  <input type="text" value={taskFormValues.client} onChange={(e) => setTaskFormValues(prev => ({ ...prev, client: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Client name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Assignee</label>
                    <input type="text" value={taskFormValues.assignee} onChange={(e) => setTaskFormValues(prev => ({ ...prev, assignee: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Staff name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Due</label>
                    <input type="text" value={taskFormValues.due} onChange={(e) => setTaskFormValues(prev => ({ ...prev, due: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="20 Jul" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Priority</label>
                    <select value={taskFormValues.priority} onChange={(e) => setTaskFormValues(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Status</label>
                    <select value={taskFormValues.status} onChange={(e) => setTaskFormValues(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Add Lead' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Lead Name *</label>
                  <input type="text" value={leadFormValues.name} onChange={(e) => setLeadFormValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter lead name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Contact Person</label>
                  <input type="text" value={leadFormValues.contact} onChange={(e) => setLeadFormValues(prev => ({ ...prev, contact: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Contact name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Source</label>
                    <select value={leadFormValues.source} onChange={(e) => setLeadFormValues(prev => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Service</label>
                    <input type="text" value={leadFormValues.service} onChange={(e) => setLeadFormValues(prev => ({ ...prev, service: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="GST / Audit" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Status</label>
                    <select value={leadFormValues.status} onChange={(e) => setLeadFormValues(prev => ({ ...prev, status: e.target.value as 'Hot' | 'Warm' | 'Cold' | 'Converted' }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Converted">Converted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Follow-up</label>
                    <input type="text" value={leadFormValues.followUp} onChange={(e) => setLeadFormValues(prev => ({ ...prev, followUp: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Today / 22 Jul" />
                  </div>
                </div>
              </div>
            ) : actionModal.title === 'Add Client' ? (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Client Name *</label>
                  <input type="text" value={formValues.clientName} onChange={(e) => setFormValues(prev => ({ ...prev, clientName: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter client name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Assigned CA</label>
                  <input type="text" value={formValues.caName} onChange={(e) => setFormValues(prev => ({ ...prev, caName: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="CA name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">PAN</label>
                    <input type="text" value={formValues.pan} maxLength={10} onChange={(e) => { const value = e.target.value.toUpperCase().slice(0, 10); setFormValues(prev => ({ ...prev, pan: value })); setFormErrors(prev => ({ ...prev, pan: undefined })); }} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="AABCT1234A" />
                  {formErrors.pan && <div className="mt-1 text-xs text-[#e53e3e]">{formErrors.pan}</div>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">GSTIN</label>
                    <input type="text" value={formValues.gstin} maxLength={15} onChange={(e) => { const value = e.target.value.toUpperCase().slice(0, 15); setFormValues(prev => ({ ...prev, gstin: value })); setFormErrors(prev => ({ ...prev, gstin: undefined })); }} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="27AABCT1234A1Z5" />
                    {formErrors.gstin && <div className="mt-1 text-xs text-[#e53e3e]">{formErrors.gstin}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Services</label>
                    <input type="number" min="1" value={formValues.services} onChange={(e) => setFormValues(prev => ({ ...prev, services: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="3" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Status</label>
                    <select value={formValues.status} onChange={(e) => setFormValues(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Name / Title *</label>
                  <input type="text" className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter details..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Additional Information</label>
                  <textarea className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Optional notes..."></textarea>
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
                showToast(`${actionModal.title} saved successfully!`, 'success');
                setActionModal(null);
              }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-transform active:scale-95 flex justify-center items-center gap-2" 
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              {actionModal.type === 'upload' ? 'Confirm Upload' : actionModal.title === 'Add Client' ? 'Add Client' : actionModal.title === 'Add Lead' ? 'Add Lead' : actionModal.title === 'Add Employee' ? 'Add Employee' : actionModal.title === 'Add Service' ? 'Add Service' : actionModal.title === 'Assign Task' ? 'Assign Task' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-white/10" style={{ background: "#102A43" }}>
            {toastMessage.type === 'success' && <CheckCircle size={18} style={{ color: "#087F5B" }} />}
            {toastMessage.type === 'info' && <Info size={18} style={{ color: "#3B82F6" }} />}
            {toastMessage.type === 'error' && <AlertCircle size={18} style={{ color: "#e53e3e" }} />}
            <span className="text-sm font-semibold text-white" style={{ fontFamily: "Inter" }}>{toastMessage.msg}</span>
          </div>
        </div>
      )}
      {/* Admin Header */}
      <div className="flex-shrink-0 border-b bg-white/5 z-10 relative shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>A</span>
            </div>
            <div>
              <span className="font-bold text-white" style={{ fontFamily: "Manrope" }}>
                {userRole === 'Super Admin' ? 'Finovara Admin' : `Finovara`}
              </span>
              <span className="block text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                {userRole === 'Super Admin' ? 'Practice Management Portal' : `${userRole} Portal`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md" style={{ background: "linear-gradient(135deg, #102A43, #e53e3e)" }}>AM</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#e53e3e] transition-colors" style={{ fontFamily: "Inter" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col h-full pb-2">
            <div className="bg-white/5 rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden shadow-sm">
              {(() => {
                const r = roles.find(x => x.name === userRole);
                return r ? (
                  <div className="flex-shrink-0 p-5 border-b" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)", borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: r.bg }}>
                        <r.icon size={16} style={{ color: r.color }} />
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm" style={{ fontFamily: "Manrope" }}>{r.name}</div>
                        <div className="text-white/50 text-xs" style={{ fontFamily: "Inter" }}>{tabs.length} modules</div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60 leading-relaxed" style={{ fontFamily: "Inter" }}>{r.desc}</div>
                  </div>
                ) : null;
              })()}
              <nav className="flex-1 overflow-y-auto p-2">
                {tabs.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => setActiveTab(label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${activeTab === label ? "text-white shadow-sm" : "text-[#94A3B8] hover:bg-[#102A43] hover:text-white"}`}
                    style={activeTab === label ? { background: "linear-gradient(135deg, #102A43, #0d3355)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${activeTab === label ? "text-white shadow-sm" : "bg-white/5 text-[#94A3B8] border border-white/10"}`}
                style={activeTab === label ? { background: "linear-gradient(135deg, #102A43, #0d3355)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 h-full pb-2">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 flex flex-col h-full shadow-sm overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
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