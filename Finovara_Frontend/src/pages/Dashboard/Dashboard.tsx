import { useState, useEffect } from "react";
import {
  Menu, X, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Phone, Mail,
  MapPin, Shield, Clock, FileText, BarChart2, Users, Briefcase, CheckCircle,
  Building2, Globe, Star, Quote, Download, Send, Lock, Bell, Folder,
  TrendingUp, Award, Zap, Calendar, MessageCircle, ExternalLink, Play,
  BookOpen, Search, Filter, Heart, Linkedin, Twitter, Instagram, Youtube,
  Facebook, ChevronLeft, PieChart, DollarSign, FileCheck, UserCheck,
  AlertCircle, Info, ArrowUpRight, Target, Layers, Cpu, Lightbulb, Flag,
  CreditCard, ClipboardList, UploadCloud, AlertTriangle, HelpCircle,
  ReceiptText, User2, LogOut, Loader2
} from "lucide-react";
import { Page } from "../../types/index";
import { useAuth } from "../../context";

export function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const { logout } = useAuth();
  const handleLogout = async () => { await logout(); setPage("login"); };
  const [activeTab, setActiveTab] = useState("Active Services");
  const [openVaultCategory, setOpenVaultCategory] = useState<string | null>(null);

  // Global UI State
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'info'|'error'} | null>(null);
  const [actionModal, setActionModal] = useState<{title: string, type: 'form'|'upload'} | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<{title: string, onUpload: (filename: string) => void} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modalForm, setModalForm] = useState({ subject: "", description: "" });
  const [pendingTasks, setPendingTasks] = useState([
    { t:"Share Form 16", d:"Due 25 Jul", u:"High"},
    { t:"Provide Bank Statement – Q1", d:"Due 28 Jul", u:"Medium"},
    { t:"Approve Draft P&L Statement", d:"Due 30 Jul", u:"High"},
    { t:"Sign GST Return Authorisation", d:"Due 31 Jul", u:"Low"}
  ]);

  const showToast = (msg: string, type: 'success'|'info'|'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Module Data States
  const [uploadedDocs, setUploadedDocs] = useState([
    { n:"Form 16 – FY 2024-25.pdf", sz:"1.2 MB", d:"18 Jul 2025" },
    { n:"Bank Statement Q1.xlsx", sz:"340 KB", d:"15 Jul 2025" },
    { n:"Investment Proofs.zip", sz:"4.5 MB", d:"10 Jul 2025" },
    { n:"PAN Card.pdf", sz:"200 KB", d:"05 Jul 2025" }
  ]);

  const [missingDocs, setMissingDocs] = useState([
    { n:"Form 26AS – FY 2024-25", r:"Income Tax Filing" },
    { n:"GST Registration Certificate", r:"GST Advisory" },
    { n:"Salary Slips – Apr to Jun 2025", r:"Payroll Processing" },
    { n:"Balance Sheet FY 2024", r:"Audit & Assurance" }
  ]);

  const [invoices, setInvoices] = useState([
    { n:"INV-2025-0041", s:"GST Return Filing", amt:"₹4,500", d:"15 Jul 2025", st:"Paid" },
    { n:"INV-2025-0040", s:"Income Tax Advisory", amt:"₹8,000", d:"05 Jul 2025", st:"Paid" },
    { n:"INV-2025-0039", s:"Payroll Processing", amt:"₹6,000", d:"30 Jun 2025", st:"Overdue" },
    { n:"INV-2025-0038", s:"Virtual CFO – Q1", amt:"₹25,000", d:"15 Jun 2025", st:"Paid" }
  ]);

  const [vaultFiles, setVaultFiles] = useState<Record<string, string[]>>({
    "PAN Documents":           ["PAN Card – Rajesh Mehta.pdf", "PAN Card – TechCorp India.pdf"],
    "Aadhaar / Identity Docs": ["Aadhaar – Rajesh Mehta.pdf", "Passport Copy.pdf", "Director ID Proof.pdf"],
    "GST Records":             ["GST Registration Certificate.pdf", "GSTR-3B Jun 2025.pdf", "GSTR-1 Jun 2025.pdf", "GST Annual Return FY24.pdf", "GST LUT Certificate.pdf", "E-Invoice Setup.pdf", "GST Refund Claim.pdf", "GST Audit Report FY23.pdf"],
    "Financial Statements":    ["Balance Sheet FY 2024-25.pdf", "P&L Statement FY 2024-25.pdf", "Cash Flow Statement.pdf", "Notes to Accounts.pdf", "Auditor's Report.pdf"],
    "Bank Statements":         ["HDFC Bank – Apr 2025.pdf", "HDFC Bank – May 2025.pdf", "HDFC Bank – Jun 2025.pdf", "ICICI OD Account – Q1.pdf", "Savings Account Apr.pdf", "Savings Account May.pdf", "Savings Account Jun.pdf", "FD Certificate.pdf", "Bank Reconciliation Apr.xlsx", "Bank Reconciliation May.xlsx", "Bank Reconciliation Jun.xlsx", "Bank Summary FY24.pdf"],
    "Payroll Data":            ["Payroll Register Apr 2025.xlsx", "Payroll Register May 2025.xlsx", "Payroll Register Jun 2025.xlsx", "Payslips Q1 2025.zip", "PF Challan Q1.pdf", "ESI Challan Q1.pdf"],
    "Agreements":              ["Shareholder Agreement.pdf", "Director Service Agreement.pdf", "Vendor Agreement – ABC Ltd.pdf", "Office Lease Agreement.pdf"],
    "Audit Evidence":          ["Voucher Testing Q1.xlsx", "Control Testing Report.pdf", "Bank Confirmation Letter.pdf", "Stock Verification Report.pdf", "Debtor Confirmation.pdf", "Creditor Confirmation.pdf", "Fixed Asset Register.xlsx", "Management Representation.pdf", "Audit Closing Memo.pdf"],
    "Tax Notices":             ["Income Tax Notice – Sec 143(1).pdf", "GST SCN – Jun 2025.pdf", "TDS Demand Notice.pdf"],
    "Filing Acknowledgements": ["ITR-1 Ack FY 2024-25.pdf", "GSTR-3B Ack Jun 2025.pdf", "GSTR-1 Ack Jun 2025.pdf", "TDS Return Ack Q1.pdf", "ROC Annual Return Ack.pdf", "PF Return Ack Jun.pdf", "ESI Return Ack Jun.pdf"],
  });

  const [openQueries, setOpenQueries] = useState([
    { q:"What is the ITR due date for FY 2024-25?", status:"Answered", a:"The due date for ITR filing for FY 2024-25 is 31st July 2025 for individuals." },
    { q:"Is my GST registration still active?", status:"Answered", a:"Yes, your GST registration is active. Next return due: 20th July 2025." },
    { q:"Can I claim HRA deduction without actual rent receipts?", status:"Pending", a:"" }
  ]);

  const tabs = [
    { label: "Active Services",     icon: CheckCircle },
    { label: "Pending Tasks",        icon: ClipboardList },
    { label: "Upcoming Due Dates",   icon: Calendar },
    { label: "Document Vault",       icon: Folder },
    { label: "Uploaded Documents",   icon: UploadCloud },
    { label: "Missing Documents",    icon: AlertTriangle },
    { label: "Assigned Consultant",  icon: User2 },
    { label: "Open Queries",         icon: HelpCircle },
    { label: "Filing Status",        icon: FileCheck },
    { label: "Reports",              icon: BarChart2 },
    { label: "Invoices",             icon: ReceiptText },
    { label: "Payments",             icon: CreditCard },
    { label: "Notifications",        icon: Bell },
    { label: "Security",             icon: Shield },
  ];

  const handlePayInvoice = (invoiceNo: string) => {
    showToast(`Initiating payment for ${invoiceNo}...`, "info");
    setTimeout(() => {
      setInvoices(prev => prev.map(inv => inv.n === invoiceNo ? { ...inv, st: "Paid" } : inv));
      showToast(`Payment successful for ${invoiceNo}!`, "success");
    }, 1500);
  };

  const handleUploadMissingDoc = (docName: string) => {
    setShowUploadModal({
      title: `Upload ${docName}`,
      onUpload: (filename) => {
        setMissingDocs(prev => prev.filter(d => d.n !== docName));
        setUploadedDocs(prev => [{ n: filename, sz: "2.1 MB", d: "Just now" }, ...prev]);
        showToast(`Document uploaded successfully and pending verification!`);
      }
    });
  };

  const handleVaultUpload = (category: string) => {
    setShowUploadModal({
      title: `Upload to ${category}`,
      onUpload: (filename) => {
        setVaultFiles(prev => ({
          ...prev,
          [category]: [filename, ...(prev[category] || [])]
        }));
        showToast(`File added to ${category}`);
      }
    });
  };

  const handleViewTask = (taskTitle: string) => {
    setPendingTasks(prev => prev.filter(task => task.t !== taskTitle));
    showToast(`Task marked complete: ${taskTitle}`, "success");
  };

  const handleDownloadFile = (filename: string) => {
    const content = `Finovara Portal Download\nFile: ${filename}\nDownloaded: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloading ${filename}...`, "info");
  };

  const handleScheduleCall = () => {
    showToast("Meeting scheduler opened. Our team will reach out shortly.", "success");
    setActiveTab("Notifications");
  };

  const handleSubmitQuery = () => {
    const subject = modalForm.subject.trim();
    const description = modalForm.description.trim();
    if (!subject) {
      showToast("Please add a query subject before submitting.", "error");
      return;
    }

    setOpenQueries(prev => [{ q: subject, status: "Pending", a: description || "We'll review this and get back to you soon." }, ...prev]);
    setModalForm({ subject: "", description: "" });
    setActionModal(null);
    showToast("Query submitted successfully. Our team will respond shortly.", "success");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Active Services": return (
        <div className="space-y-4">
          {["Income Tax Filing – FY 2024-25", "GST Return Filing – Monthly", "Payroll Processing – June 2025", "Virtual CFO Advisory"].map((s, i) => (
            <div key={s} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><CheckCircle size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{s}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>In Progress</div></div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B" }}>{["In Progress","Ongoing","Processing","Active"][i]}</span>
            </div>
          ))}
        </div>
      );
      case "Pending Tasks": return (
        <div className="space-y-4">
          {pendingTasks.map(({t,d,u}) => (
            <div key={t} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10 hover:border-[#087F5B]/20 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: u==="High"?"#FFF0F0":u==="Medium"?"#FFF4E0":"#EAF4F0" }}><AlertCircle size={16} style={{ color: u==="High"?"#e53e3e":u==="Medium"?"#C8A45D":"#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{t}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: u==="High"?"#FFF0F0":u==="Medium"?"#FFF4E0":"#EAF4F0", color: u==="High"?"#e53e3e":u==="Medium"?"#C8A45D":"#087F5B" }}>{u}</span>
                <button onClick={() => handleViewTask(t)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold px-3 py-1 rounded-lg bg-white/5 border border-white/10">Complete</button>
              </div>
            </div>
          ))}
        </div>
      );
      case "Upcoming Due Dates": return (
        <div className="space-y-4">
          {[{t:"GSTR-3B Filing",d:"20 Jul 2025",s:"GST"},{t:"TDS Payment",d:"07 Aug 2025",s:"Direct Tax"},{t:"Advance Tax Q2",d:"15 Sep 2025",s:"Income Tax"},{t:"ROC Annual Filing",d:"30 Sep 2025",s:"Corporate"}].map(({t,d,s}) => (
            <div key={t} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><Calendar size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{t}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{s}</div></div>
              </div>
              <span className="text-sm font-bold text-white" style={{ fontFamily: "Manrope" }}>{d}</span>
            </div>
          ))}
        </div>
      );
      case "Uploaded Documents": return (
        <div className="space-y-4">
          {uploadedDocs.map(({n,sz,d}) => (
            <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><FileText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{sz} · {d}</div></div>
              </div>
              <button onClick={() => handleDownloadFile(n)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EAF4F0] transition-colors" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
            </div>
          ))}
          {uploadedDocs.length === 0 && <div className="text-sm text-[#94A3B8] py-4">No documents uploaded recently.</div>}
        </div>
      );
      case "Missing Documents": return (
        <div className="space-y-4">
          {missingDocs.map(({n,r}) => (
            <div key={n} className="flex items-center justify-between p-4 rounded-2xl border transition-all" style={{ background: "#FFF8F8", borderColor: "rgba(229,62,62,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF0F0" }}><AlertTriangle size={16} style={{ color: "#e53e3e" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Required for: {r}</div></div>
              </div>
              <button onClick={() => handleUploadMissingDoc(n)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-transform active:scale-95" style={{ background: "#e53e3e", color: "white" }}><UploadCloud size={12} /> Upload</button>
            </div>
          ))}
          {missingDocs.length === 0 && <div className="p-5 text-center text-sm font-semibold text-[#087F5B] bg-[#EAF4F0] rounded-2xl border border-white/10">All required documents have been uploaded!</div>}
        </div>
      );
      case "Assigned Consultant": return (
        <div className="max-w-sm">
          <div className="bg-[#102A43] rounded-2xl p-6 border border-white/10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white mb-4" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)", fontFamily: "Manrope" }}>CA</div>
            <div className="font-bold text-white text-xl mb-1" style={{ fontFamily: "Manrope" }}>CA Priya Nair</div>
            <div className="text-sm mb-4" style={{ color: "#087F5B", fontFamily: "Inter" }}>Senior Partner – GST & Indirect Tax</div>
            {[{icon: Phone, v:"+91 98765 43210"},{icon: Mail, v:"priya.nair@finovara.in"},{icon: Clock, v:"Available: Mon–Sat, 10am–6pm"}].map(({icon: Icon, v}) => (
              <div key={v} className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: "#087F5B" }} />
                <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{v}</span>
              </div>
            ))}
            <button onClick={handleScheduleCall} className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>Schedule a Call</button>
          </div>
        </div>
      );
      case "Open Queries": return (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setModalForm({ subject: "", description: "" }); setActionModal({title: 'Raise New Query', type: 'form'}); }} className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>+ Raise Query</button>
          </div>
          <div className="space-y-4">
            {openQueries.map(({q,status,a}) => (
              <div key={q} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{q}</div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: status==="Answered"?"#EAF4F0":"#FFF4E0", color: status==="Answered"?"#087F5B":"#C8A45D" }}>{status}</span>
                </div>
                {a && <p className="text-xs text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{a}</p>}
                {status === "Pending" && <p className="text-xs text-[#C8A45D] italic mt-1">Our team is reviewing this query.</p>}
              </div>
            ))}
          </div>
        </div>
      );
      case "Filing Status": return (
        <div className="space-y-4">
          {[{f:"ITR-1 FY 2024-25",st:"Filed",ack:"ACKXXXXXXXXXX",d:"15 Jul 2025"},{f:"GSTR-3B June 2025",st:"Filed",ack:"GST2025XXXXXX",d:"19 Jul 2025"},{f:"TDS Q1 FY 2025-26",st:"Processing",ack:"—",d:"In Progress"},{f:"ROC Annual Return",st:"Pending",ack:"—",d:"Due Sep 2025"}].map(({f,st,ack,d}) => (
            <div key={f} className="p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{f}</div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: st==="Filed"?"#EAF4F0":st==="Processing"?"#FFF4E0":"#102A43", color: st==="Filed"?"#087F5B":st==="Processing"?"#C8A45D":"#52606D" }}>{st}</span>
              </div>
              <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Ack No: {ack} · {d}</div>
            </div>
          ))}
        </div>
      );
      case "Reports": return (
        <div className="space-y-4">
          {[{n:"Balance Sheet – FY 2024-25",t:"Financial Report",d:"10 Jul 2025"},{n:"Profit & Loss Statement Q1",t:"MIS Report",d:"05 Jul 2025"},{n:"GST Reconciliation Report",t:"GST Report",d:"01 Jul 2025"},{n:"TDS Computation Sheet",t:"Tax Report",d:"28 Jun 2025"}].map(({n,t,d}) => (
            <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><BarChart2 size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{t} · {d}</div></div>
              </div>
              <button onClick={() => handleDownloadFile(n)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EAF4F0] transition-colors" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
            </div>
          ))}
        </div>
      );
      case "Invoices": return (
        <div className="space-y-4">
          {invoices.map(({n,s,amt,d,st}) => (
            <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10 transition-colors hover:border-[#087F5B]/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><ReceiptText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n} · {s}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</div></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-white text-sm" style={{ fontFamily: "Manrope" }}>{amt}</div>
                  <span className="text-xs font-bold" style={{ color: st==="Paid"?"#087F5B":"#e53e3e" }}>{st}</span>
                </div>
                {st === "Overdue" && (
                  <button onClick={() => handlePayInvoice(n)} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-transform active:scale-95" style={{ background: "#e53e3e" }}>Pay Now</button>
                )}
                {st === "Paid" && (
                  <button onClick={() => handleDownloadFile(`Invoice ${n}`)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-white">Download</button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
      case "Payments": return (
        <div className="space-y-4">
          {[{d:"15 Jul 2025",ref:"PAY-2025-041",amt:"₹4,500",m:"Online – UPI"},{d:"05 Jul 2025",ref:"PAY-2025-040",amt:"₹8,000",m:"Bank Transfer"},{d:"15 Jun 2025",ref:"PAY-2025-038",amt:"₹25,000",m:"Cheque"}].map(({d,ref,amt,m}) => (
            <div key={ref} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><CreditCard size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{ref}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{m} · {d}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-bold text-[#087F5B] text-sm" style={{ fontFamily: "Manrope" }}>{amt}</div>
                <button onClick={() => handleDownloadFile(ref)} className="text-[#087F5B] p-1 rounded hover:bg-[#EAF4F0]"><Download size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      );
      case "Notifications": return (
        <div className="space-y-4">
          {[{title:"GSTR-3B Due Tomorrow",msg:"Your GST return for June 2025 is due on 20th July 2025.",t:"2 hours ago",type:"warning"},{title:"Document Received",msg:"Form 16 uploaded successfully and forwarded to your advisor.",t:"1 day ago",type:"success"},{title:"ITR Filed Successfully",msg:"Your ITR-1 for FY 2024-25 has been filed. Acknowledgement sent to email.",t:"3 days ago",type:"success"},{title:"Invoice Generated",msg:"Invoice INV-2025-0041 for GST Return Filing has been generated.",t:"5 days ago",type:"info"}].map(({title,msg,t,type}) => (
            <div key={title} className="flex items-start gap-4 p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: type==="success"?"#EAF4F0":type==="warning"?"#FFF4E0":"#EEF1F5" }}>
                {type==="success"?<CheckCircle size={16} style={{ color: "#087F5B" }} />:type==="warning"?<Bell size={16} style={{ color: "#C8A45D" }} />:<Info size={16} style={{ color: "white" }} />}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm mb-1" style={{ fontFamily: "Manrope" }}>{title}</div>
                <p className="text-xs text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{msg}</p>
                <div className="text-xs text-[#94A3B8] mt-1" style={{ fontFamily: "Inter" }}>{t}</div>
              </div>
            </div>
          ))}
        </div>
      );
      case "Document Vault": {
        const vaultCategories = [
          { label: "PAN Documents",             icon: FileText, count: vaultFiles["PAN Documents"]?.length || 0,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Aadhaar / Identity Docs",   icon: Shield,   count: vaultFiles["Aadhaar / Identity Docs"]?.length || 0,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "GST Records",               icon: FileCheck,count: vaultFiles["GST Records"]?.length || 0,  color: "#C8A45D", bg: "#FFF4E0" },
          { label: "Financial Statements",      icon: BarChart2,count: vaultFiles["Financial Statements"]?.length || 0,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Bank Statements",           icon: DollarSign,count: vaultFiles["Bank Statements"]?.length || 0, color: "white", bg: "#EEF1F5" },
          { label: "Payroll Data",              icon: Users,    count: vaultFiles["Payroll Data"]?.length || 0,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Agreements",                icon: FileText, count: vaultFiles["Agreements"]?.length || 0,  color: "#C8A45D", bg: "#FFF4E0" },
          { label: "Audit Evidence",            icon: Search,   count: vaultFiles["Audit Evidence"]?.length || 0,  color: "white", bg: "#EEF1F5" },
          { label: "Tax Notices",               icon: AlertCircle, count: vaultFiles["Tax Notices"]?.length || 0, color: "#e53e3e", bg: "#FFF0F0" },
          { label: "Filing Acknowledgements",   icon: CheckCircle, count: vaultFiles["Filing Acknowledgements"]?.length || 0, color: "#087F5B", bg: "#EAF4F0" },
        ];
        return (
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {vaultCategories.map(({ label, icon: Icon, count, color, bg }) => (
                <button key={label}
                  onClick={() => setOpenVaultCategory(openVaultCategory === label ? null : label)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    openVaultCategory === label
                      ? "border-[#087F5B] shadow-lg"
                      : "bg-[#102A43] border-white/10 hover:border-[#087F5B]/20"
                  }`}
                  style={openVaultCategory === label ? { background: "linear-gradient(135deg, #102A43, #0d3355)" } : {}}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: openVaultCategory === label ? "rgba(255,255,255,0.1)" : bg }}>
                    <Icon size={20} style={{ color: openVaultCategory === label ? "#C8A45D" : color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ fontFamily: "Manrope", color: openVaultCategory === label ? "white" : "#102A43" }}>{label}</div>
                    <div className="text-xs mt-0.5" style={{ fontFamily: "Inter", color: openVaultCategory === label ? "rgba(255,255,255,0.5)" : "#52606D" }}>{count} file{count !== 1 ? "s" : ""}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: openVaultCategory === label ? "white" : "#52606D" }}
                    className={`transition-transform flex-shrink-0 ${openVaultCategory === label ? "rotate-90" : ""}`} />
                </button>
              ))}
            </div>

            {openVaultCategory && (
              <div className="bg-[#102A43] rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white" style={{ fontFamily: "Manrope" }}>{openVaultCategory}</h4>
                  <button onClick={() => handleVaultUpload(openVaultCategory)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    <UploadCloud size={12} /> Upload New
                  </button>
                </div>
                <div className="space-y-2">
                  {(vaultFiles[openVaultCategory] || []).map(file => (
                    <div key={file} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-[#087F5B]/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={15} style={{ color: "#087F5B" }} />
                        <span className="text-sm font-medium text-white" style={{ fontFamily: "Inter" }}>{file}</span>
                      </div>
                      <button onClick={() => handleDownloadFile(file)} className="flex items-center gap-1 text-xs font-semibold p-1.5 rounded hover:bg-[#EAF4F0]" style={{ color: "#087F5B" }}>
                        <Download size={13} />
                      </button>
                    </div>
                  ))}
                  {(vaultFiles[openVaultCategory] || []).length === 0 && <div className="text-sm text-[#94A3B8] py-2">No documents found.</div>}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "Security": return (
        <div>
          <div className="mb-6 p-5 rounded-2xl flex items-center gap-4" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.25)" }}>
              <Shield size={24} style={{ color: "#087F5B" }} />
            </div>
            <div>
              <div className="font-bold text-white text-lg" style={{ fontFamily: "Manrope" }}>Enterprise Security</div>
              <div className="text-xs text-white/50" style={{ fontFamily: "Inter" }}>Your account is protected with bank-grade, multi-layer security controls.</div>
            </div>
            <div className="ml-auto flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#EAF4F0", color: "#087F5B" }}>
              All Active ✓
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Shield,       label: "Two-Factor Authentication",  desc: "OTP + authenticator app for every login session.",                  status: "Enabled",  color: "#087F5B", bg: "#EAF4F0" },
              { icon: Lock,         label: "Secure File Links",           desc: "Time-limited, cryptographically signed URLs for every document.",    status: "Active",   color: "#087F5B", bg: "#EAF4F0" },
              { icon: Users,        label: "Role-Based Access",           desc: "Granular permissions per user, role, and team.",                     status: "Configured",color: "#087F5B", bg: "#EAF4F0" },
              { icon: FileText,     label: "Audit Logs",                  desc: "Full, immutable activity trail for every portal action.",            status: "Enabled",  color: "#C8A45D", bg: "#FFF4E0" },
              { icon: Clock,        label: "File-Version History",        desc: "Restore any previous version of an uploaded file at any time.",      status: "On",       color: "#087F5B", bg: "#EAF4F0" },
              { icon: AlertCircle,  label: "Session Timeout",             desc: "Auto-logout triggered after 15 minutes of inactivity.",              status: "15 min",   color: "#C8A45D", bg: "#FFF4E0" },
              { icon: Globe,        label: "Device-Login Tracking",       desc: "Real-time alerts and logs for every new device sign-in.",            status: "Active",   color: "#087F5B", bg: "#EAF4F0" },
              { icon: Star,         label: "Encrypted Sensitive Data",    desc: "AES-256 encryption applied at rest and in transit for all data.",    status: "AES-256",  color: "#087F5B", bg: "#EAF4F0" },
              { icon: CheckCircle,  label: "Password-Reset Protection",   desc: "MFA-verified resets with anomaly detection and IP blocking.",        status: "Protected", color: "#087F5B", bg: "#EAF4F0" },
            ].map(({ icon: Icon, label, desc, status, color, bg }) => (
              <div key={label} className="flex items-start gap-4 p-5 bg-[#102A43] rounded-2xl border border-white/10 hover:border-[#087F5B]/20 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-bold text-white text-sm" style={{ fontFamily: "Manrope" }}>{label}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: bg, color }}>{status}</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "#102A43" }}>
      {/* Toast Notification */}
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

      {/* Upload Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/5 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">{actionModal.title}</h3>
              <button onClick={() => setActionModal(null)} className="text-[#94A3B8] hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-5 text-left">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">Subject / Query *</label>
                <input type="text" value={modalForm.subject} onChange={(e) => setModalForm(prev => ({ ...prev, subject: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Enter query subject..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1">Detailed Description</label>
                <textarea rows={4} value={modalForm.description} onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#087F5B] focus:ring-1 focus:ring-[#087F5B]" placeholder="Describe your query in detail..."></textarea>
              </div>
            </div>
            <button 
              onClick={handleSubmitQuery}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-transform active:scale-95 flex justify-center items-center gap-2" 
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              Submit Query
            </button>
          </div>
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/5 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">{showUploadModal.title}</h3>
              <button onClick={() => setShowUploadModal(null)} className="text-[#94A3B8] hover:text-white"><X size={20} /></button>
            </div>
            <div className="border-2 border-dashed border-[#087F5B]/30 rounded-xl p-8 text-center bg-[#EAF4F0]/50 mb-5">
              <UploadCloud size={32} className="mx-auto mb-3 text-[#087F5B]" />
              <p className="text-sm font-semibold text-white mb-1">Click to browse or drag and drop</p>
              <p className="text-xs text-[#94A3B8]">PDF, XLSX, ZIP (Max. 10MB)</p>
            </div>
            <button 
              onClick={() => {
                setIsUploading(true);
                setTimeout(() => {
                  setIsUploading(false);
                  showUploadModal.onUpload("Uploaded_Document_New.pdf");
                  setShowUploadModal(null);
                }, 1500);
              }}
              disabled={isUploading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex justify-center items-center gap-2" 
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {isUploading ? "Uploading..." : "Confirm Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex-shrink-0 border-b bg-white/5 z-10 relative shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div>
              <span className="font-bold text-white" style={{ fontFamily: "Manrope" }}>Finovara</span>
              <span className="block text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Client Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>Rajesh Mehta</div>
              <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>TechCorp India Pvt Ltd</div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>RM</div>
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
            {/* Compliance Score */}
            <div className="flex-shrink-0 p-5 border-b" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Compliance Score</div>
              <div className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>98%</div>
              <div className="text-xs text-white/50 mt-1" style={{ fontFamily: "Inter" }}>Excellent standing</div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {tabs.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => setActiveTab(label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${
                    activeTab === label ? "text-white shadow-sm" : "text-[#94A3B8] hover:bg-[#102A43] hover:text-white"
                  }`}
                  style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Tabs */}
        <div className="lg:hidden w-full flex-shrink-0 flex overflow-x-auto gap-2 pb-1">
          {tabs.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                activeTab === label ? "text-white shadow-sm" : "bg-white/5 text-[#94A3B8] border border-white/10"
              }`}
              style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full pb-2">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6 flex flex-col h-full shadow-sm overflow-hidden relative">
            <h2 className="flex-shrink-0 text-xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
            <div className="flex-1 overflow-y-auto pr-2">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}