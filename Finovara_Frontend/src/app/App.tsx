import { useState, useEffect, useRef, useCallback } from "react";
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

type Page =
  | "home" | "about" | "services" | "industries" | "insights"
  | "resources" | "blogs" | "faqs" | "testimonials" | "careers"
  | "contact" | "book" | "login" | "dashboard" | "admin";

const NAV_ITEMS = [
  { label: "Home", page: "home" as Page },
  { label: "About", page: "about" as Page },
  { label: "Services", page: "services" as Page },
  { label: "Industries", page: "industries" as Page },
  { label: "Client Portal", page: "login" as Page },
  { label: "Insights", page: "insights" as Page },
  {
    label: "Resources", page: "resources" as Page,
    children: [
      { label: "Resources", page: "resources" as Page },
      { label: "Blog", page: "blogs" as Page },
      { label: "FAQs", page: "faqs" as Page },
      { label: "Testimonials", page: "testimonials" as Page },
    ]
  },
  { label: "Careers", page: "careers" as Page },
  { label: "Contact", page: "contact" as Page },
  { label: "Login", page: "login" as Page, isButton: true },
];

const STATS = [
  { value: 65, suffix: "+", label: "Professionals" },
  { value: 1500, suffix: "+", label: "Clients Supported" },
  { value: 4000, suffix: "+", label: "Tax Filings" },
  { value: 750, suffix: "+", label: "GST Registrations" },
  { value: 500, suffix: "+", label: "Audit Assignments" },
  { value: 300, suffix: "+", label: "Incorporations" },
  { value: 150, suffix: "+", label: "Virtual CFO" },
  { value: 96, suffix: "%", label: "Client Retention" },
];

const SERVICES = [
  { 
    icon: FileText, 
    title: "Income Tax", 
    desc: "Strategic tax planning, ITR filing, assessments, and appeals for individuals and corporates.",
    features: ["Individual tax returns", "Business tax returns", "Tax planning", "Advance-tax calculations", "TDS compliance", "Tax notices", "Tax assessments", "Tax advisory"],
    portalFeatures: ["Select financial year", "Upload Form 16 / 15", "Upload bank statements", "Upload investment proofs", "Assign tax consultant", "Track preparation status", "Download acknowledgement", "Receive tax reminders"]
  },
  { 
    icon: FileCheck, 
    title: "GST Services", 
    desc: "GST registration, monthly/quarterly returns, audits, and advisory services.",
    features: ["GST registration", "GST return filing", "GST reconciliation", "GST audit support", "E-invoice assistance", "E-way bill advisory", "GST notice support", "Input-tax-credit review"],
    deliverables: ["Filing report", "Reconciliation report", "Liability summary", "Pending-document list", "Return acknowledgement", "Compliance calendar"]
  },
  { 
    icon: Shield, 
    title: "Audit & Assurance", 
    desc: "Statutory, internal, and tax audits ensuring compliance and financial integrity.",
    features: ["Statutory audit", "Internal audit", "Tax audit", "Stock audit", "Concurrent audit", "Process audit", "Compliance audit", "Management audit"],
    workflow: [
      { step: "Assignment", desc: "Initial onboarding, scope definition, and team allocation." },
      { step: "Document Request", desc: "Secure request list generated for required financial and operational data." },
      { step: "Document Submission", desc: "Client uploads requested documents securely via the portal." },
      { step: "Verification", desc: "Detailed vouching, verification, and analytical procedures by the audit team." },
      { step: "Observation Recording", desc: "Documenting preliminary findings, control gaps, and exceptions." },
      { step: "Management Response", desc: "Discussion of observations with management to incorporate their feedback." },
      { step: "Draft Report", desc: "Preparation of draft financials and audit report for review." },
      { step: "Partner Review", desc: "Final quality review by the engagement partner." },
      { step: "Final Audit Report", desc: "Signing and delivery of the final audit report and deliverables." }
    ]
  },
  { 
    icon: BarChart2, 
    title: "Accounting & Bookkeeping", 
    desc: "Comprehensive accounting, MIS reporting, and financial statement preparation.",
    features: ["Monthly bookkeeping", "Ledger management", "Bank reconciliation", "Vendor reconciliation", "Customer reconciliation", "Financial statements", "MIS reporting", "Year-end closing"]
  },
  { 
    icon: Building2, 
    title: "Company Incorporation", 
    desc: "End-to-end company formation, ROC compliances, and corporate structuring.",
    features: ["Private limited company support", "LLP registration support", "Partnership registration support", "Startup documentation", "Annual filings", "Director-related compliance", "Registered-office support", "Corporate record maintenance"]
  },
  { 
    icon: Users, 
    title: "Payroll Management", 
    desc: "Complete payroll processing, PF, ESI, TDS, and statutory compliance.",
    features: ["Employee master", "Salary structures", "Attendance imports", "Payroll processing", "Payslip generation", "TDS calculation", "PF and ESI support", "Reimbursement records", "Payroll reports"]
  },
  { 
    icon: TrendingUp, 
    title: "Virtual CFO", 
    desc: "Strategic financial leadership, fundraising support, and board-level advisory.",
    features: ["Financial strategy", "Cash-flow management", "Budget planning", "MIS review", "Profitability analysis", "Investor reporting", "Cost optimization", "Management dashboard"]
  },
  { 
    icon: Lightbulb, 
    title: "Startup Advisory", 
    desc: "DPIIT registration, funding advisory, pitch deck review, and compliance setup.",
    features: ["Entity selection", "Compliance roadmap", "Financial projections", "Investor documentation", "Cap-table support", "Business-plan financials", "Tax planning", "Accounting setup"]
  },
  { 
    icon: Target, 
    title: "Financial Due Diligence", 
    desc: "Deep-dive financial reviews for M&A, investments, and partnership decisions.",
    deliverables: ["Financial analysis", "Revenue verification", "Liability assessment", "Tax-risk review", "Working-capital analysis", "Compliance-gap report", "Transaction-risk report", "Final due-diligence report"]
  },
  { 
    icon: Layers, 
    title: "Risk & Internal Controls", 
    desc: "Risk frameworks, control testing, and governance advisory for enterprises.",
    features: ["Process review", "Internal-control evaluation", "Fraud-risk analysis", "Approval-matrix design", "SOP documentation", "Risk register", "Control-testing report", "Corrective-action tracking"]
  },
];

const INDUSTRIES = [
  { icon: Cpu, label: "Information Technology" },
  { icon: Building2, label: "Manufacturing" },
  { icon: Flag, label: "Construction" },
  { icon: MapPin, label: "Real Estate" },
  { icon: Heart, label: "Healthcare" },
  { icon: BookOpen, label: "Education" },
  { icon: Globe, label: "E-commerce" },
  { icon: Globe, label: "Retail" },
  { icon: Star, label: "Hospitality" },
  { icon: Briefcase, label: "Logistics" },
  { icon: Zap, label: "Pharmaceuticals" },
  { icon: UserCheck, label: "Professional Services" },
  { icon: Lightbulb, label: "Startups" },
  { icon: Heart, label: "NGOs" },
  { icon: Globe, label: "Export Businesses" },
  { icon: PieChart, label: "Financial Services" },
];

const FEATURES = [
  { icon: Users, title: "Experienced Team", desc: "65+ chartered accountants and financial advisors with sector-specific expertise." },
  { icon: UserCheck, title: "Dedicated Managers", desc: "A single point of contact who knows your business inside out." },
  { icon: Lock, title: "Secure Client Portal", desc: "Bank-grade encrypted portal for document exchange and collaboration." },
  { icon: Bell, title: "Compliance Reminders", desc: "Never miss a due date with automated regulatory deadline alerts." },
  { icon: TrendingUp, title: "Real-Time Tracking", desc: "Track service progress, approvals, and deliverables live on your dashboard." },
  { icon: FileText, title: "Digital Reports", desc: "Instant digital delivery of reports, certificates, and filings." },
  { icon: BarChart2, title: "Virtual CFO Support", desc: "On-demand CFO-level guidance for strategic business decisions." },
  { icon: Lightbulb, title: "Startup Expertise", desc: "Tailored compliance and advisory packages for early-stage companies." },
  { icon: Shield, title: "Role-Based Security", desc: "Multi-level access controls ensuring data confidentiality at every level." },
];

const WORKFLOW = [
  { step: "01", title: "Consultation", desc: "Understand your business needs through a free discovery call." },
  { step: "02", title: "Requirement Collection", desc: "Our team gathers all relevant documentation and data requirements." },
  { step: "03", title: "Document Upload", desc: "Securely upload documents through our encrypted client portal." },
  { step: "04", title: "Professional Review", desc: "Qualified CAs review and validate all materials for compliance." },
  { step: "05", title: "Compliance Processing", desc: "Filing, submissions, and regulatory processing handled end-to-end." },
  { step: "06", title: "Report Preparation", desc: "Comprehensive reports prepared with clear financial insights." },
  { step: "07", title: "Client Approval", desc: "Review outputs and provide digital approval before final submission." },
  { step: "08", title: "Final Delivery", desc: "Secure delivery of all documents, certificates, and compliance filings." },
];

const FEATURED_ASSIGNMENTS = [
  { tag: "M&A Advisory", title: "Cross-Border Acquisition", desc: "Structured the acquisition of a European tech firm for an Indian SaaS unicorn, ensuring tax-efficient fund flows.", metric: "Deal Size: $45M" },
  { tag: "Restructuring", title: "Debt Restructuring for Manufacturing", desc: "Turnaround strategy and debt restructuring for a legacy textile manufacturer facing liquidity crunch.", metric: "Saved ₹25Cr" },
  { tag: "Tax Strategy", title: "FDI Tax Optimization", desc: "Optimized the inbound investment structure for a Japanese auto-component manufacturer setting up in Gujarat.", metric: "Completed in 4 weeks" }
];

const COMPLIANCE_CALENDAR = [
  { date: "15th Oct", task: "TCS Return Filing", desc: "Quarterly TCS return for the quarter ending Sept.", type: "Income Tax" },
  { date: "20th Oct", task: "GSTR-3B", desc: "Monthly GST return filing for the previous month.", type: "GST" },
  { date: "30th Oct", task: "ROC Filing (AOC-4)", desc: "Annual financial statement filing with MCA.", type: "ROC" },
  { date: "31st Oct", task: "Income Tax Audit", desc: "Due date for filing Tax Audit Report for corporate taxpayers.", type: "Income Tax" }
];

const TESTIMONIALS = [
  {
    name: "Rajesh Mehta", role: "CEO, TechCorp India", rating: 5,
    text: "Finovara transformed our financial operations. Their Virtual CFO service gave us the strategic clarity we needed to scale from ₹10Cr to ₹85Cr revenue in three years. Exceptional expertise.",
    avatar: "RM"
  },
  {
    name: "Priya Sharma", role: "Founder, Greenleaf Organics", rating: 5,
    text: "The GST advisory team at Finovara saved us lakhs in penalties through proactive compliance management. Their portal makes document management effortless.",
    avatar: "PS"
  },
  {
    name: "Anil Kapoor", role: "CFO, BuildRight Infrastructure", rating: 5,
    text: "Outstanding audit quality and turnaround time. Their team's understanding of the construction sector is unmatched. We've been clients for 7 years and counting.",
    avatar: "AK"
  },
  {
    name: "Sunita Reddy", role: "Director, MedCare Hospitals", rating: 5,
    text: "Finovara's expertise in healthcare sector compliance is exceptional. They handle our multi-entity consolidation and NABH compliance seamlessly.",
    avatar: "SR"
  },
  {
    name: "Vikram Nair", role: "Partner, Apex Ventures", rating: 5,
    text: "Their financial due diligence reports are thorough, incisive, and decision-ready. We rely on Finovara for every M&A transaction we evaluate.",
    avatar: "VN"
  },
];

const INSIGHTS = [
  {
    tag: "Tax Update", date: "15 Jan 2025",
    title: "Budget 2025: Key Changes Affecting Indian Businesses",
    excerpt: "A comprehensive breakdown of the Union Budget announcements impacting corporate tax, capital gains, and startup incentives.",
    readTime: "8 min read"
  },
  {
    tag: "GST Advisory", date: "08 Jan 2025",
    title: "New GST Return Filing Mechanism: What You Need to Know",
    excerpt: "Understanding the revised GST filing procedures and how businesses should prepare for the updated compliance framework.",
    readTime: "6 min read"
  },
  {
    tag: "Financial Planning", date: "02 Jan 2025",
    title: "Virtual CFO vs In-House CFO: The 2025 Decision Guide",
    excerpt: "A detailed cost-benefit analysis helping growing businesses decide between hiring full-time financial leadership or outsourcing.",
    readTime: "10 min read"
  },
];

const FAQS = [
  {
    q: "What is the difference between a CA and a Virtual CFO?",
    a: "A Chartered Accountant typically handles compliance — tax filings, audits, and accounting. A Virtual CFO provides strategic financial leadership: financial planning, fundraising advisory, investor relations, and board-level guidance, without the cost of a full-time hire."
  },
  {
    q: "How secure is the Finovara client portal?",
    a: "Our portal uses 256-bit AES encryption, two-factor authentication, role-based access controls, and ISO 27001-compliant infrastructure. All document transfers are end-to-end encrypted and audit-logged."
  },
  {
    q: "What industries does Finovara specialise in?",
    a: "We serve 15+ industries including IT, Manufacturing, Healthcare, Real Estate, Retail, Education, Pharmaceuticals, NGOs, Startups, and Export businesses. Each sector team has dedicated specialists."
  },
  {
    q: "How quickly can I onboard with Finovara?",
    a: "Our streamlined onboarding process takes 48-72 hours. After the initial consultation, we assign your dedicated relationship manager, set up portal access, and begin compliance review immediately."
  },
  {
    q: "Do you offer services for startups and early-stage companies?",
    a: "Absolutely. Our Startup Advisory package covers DPIIT registration, company incorporation, seed funding compliance, ESOP structuring, startup-friendly accounting, and pitch deck financial modelling."
  },
  {
    q: "What are your fee structures?",
    a: "We offer transparent, milestone-based pricing across retainer, project, and hourly engagement models. Every engagement begins with a clear scope of work and fixed deliverables so there are no billing surprises."
  },
];

const OPEN_POSITIONS = [
  { title: "Senior Chartered Accountant", dept: "Audit & Assurance", type: "Full-time", location: "Mumbai" },
  { title: "GST Manager", dept: "Indirect Tax", type: "Full-time", location: "Bangalore" },
  { title: "Virtual CFO Specialist", dept: "Advisory", type: "Full-time", location: "Remote" },
  { title: "Tax Analyst", dept: "Direct Tax", type: "Full-time", location: "Delhi" },
  { title: "Financial Controller", dept: "Client Services", type: "Full-time", location: "Hyderabad" },
];

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCountUp(value, 2200, started);
  return (
    <div className="text-center group">
      <div className="text-4xl md:text-5xl font-bold text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm font-medium uppercase tracking-widest" style={{ color: "#C8A45D" }}>{label}</div>
    </div>
  );
}

export const handleAddCalendar = (item: {date: string, task: string, desc: string, type: string}) => {
  const currentYear = new Date().getFullYear();
  const monthMap: Record<string, string> = { "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12" };
  const parts = item.date.split(" ");
  const dayStr = parts[0].replace(/\D/g, "");
  const monthStr = monthMap[parts[1]] || "01";
  
  const day = dayStr.padStart(2, "0");
  const dateString = `${currentYear}${monthStr}${day}`;

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Finovara//Compliance Calendar//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@finovara.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${dateString}
SUMMARY:${item.task} (${item.type})
DESCRIPTION:${item.desc}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.task.replace(/\s+/g, '_')}_Deadline.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

export const handleDownloadResource = (title: string) => {
  let htmlContent = "";
  let filename = "";

  if (title === "Firm Profile") {
    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finovara Firm Profile</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #102A43; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px 80px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 52px; margin: 0; font-weight: 800; }
    .header p { font-size: 20px; opacity: 0.8; margin-top: 10px; font-weight: 500; }
    .container { max-width: 900px; margin: -60px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    .hero-img { width: 100%; height: 350px; object-fit: cover; border-radius: 16px; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #102A43; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); transition: transform 0.2s; }
    .card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .card h3 { font-size: 22px; margin-top: 0; color: #102A43; font-family: 'Manrope', sans-serif; }
    .card p { line-height: 1.6; color: #52606D; margin-bottom: 0; }
    .stats { display: flex; justify-content: space-around; background: linear-gradient(135deg, #087F5B, #065a40); color: white; padding: 40px 20px; border-radius: 16px; margin-top: 50px; box-shadow: 0 15px 30px rgba(8,127,91,0.2); }
    .stat-item { text-align: center; }
    .stat-val { font-size: 42px; font-weight: 800; font-family: 'Manrope', sans-serif; margin-bottom: 5px; }
    .stat-lbl { font-size: 15px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .footer { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #EEF1F5; color: #52606D; font-size: 14px; line-height: 1.6; }
    .badges { display: flex; justify-content: center; gap: 15px; margin-bottom: 15px; }
    .badge { background: #EAF4F0; color: #087F5B; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="header">
    <h1>Finovara</h1>
    <p>Chartered Accountants LLP</p>
  </div>
  <div class="container">
    <div class="badges">
      <span class="badge">ICAI Registered</span>
      <span class="badge">ISO 27001 Certified</span>
      <span class="badge">Established 2010</span>
    </div>
    
    <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=600&fit=crop" class="hero-img" alt="Finovara Office">
    
    <h2>About Our Firm</h2>
    <p class="lead">Finovara Chartered Accountants LLP is a premier financial and advisory firm committed to delivering excellence. With over 15 years of experience, we provide a comprehensive suite of services ranging from statutory audits and tax advisory to complex financial structuring and compliance management for enterprises across India.</p>
    
    <h2>Core Competencies</h2>
    <div class="grid">
      <div class="card">
        <h3>Audit & Assurance</h3>
        <p>Robust auditing services ensuring compliance, transparency, and actionable financial insights for private and public companies.</p>
      </div>
      <div class="card">
        <h3>Tax Advisory</h3>
        <p>Strategic tax planning, assessment, and compliance for both direct (Income Tax) and indirect taxation (GST & Customs).</p>
      </div>
      <div class="card">
        <h3>Corporate Finance</h3>
        <p>Expert guidance on capital structuring, mergers, acquisitions, due diligence, and comprehensive business valuations.</p>
      </div>
      <div class="card">
        <h3>Virtual CFO</h3>
        <p>End-to-end financial management, rigorous budgeting, and strategic forecasting tailored for rapidly growing businesses.</p>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-val">15+</div>
        <div class="stat-lbl">Years Experience</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">1,500+</div>
        <div class="stat-lbl">Active Clients</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">4,000+</div>
        <div class="stat-lbl">Tax Filings</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">100%</div>
        <div class="stat-lbl">Compliance</div>
      </div>
    </div>
    
    <div class="footer">
      <strong>Finovara Chartered Accountants LLP</strong><br>
      A global standard of financial excellence and integrity.<br><br>
      Contact: contact@finovara.in | +91 98765 43210 | www.finovara.in
    </div>
  </div>
</body>
</html>`;
    filename = "Finovara_Firm_Profile.html";
  } else {
    let h2 = "";
    let body = "";
    if (title === "Compliance Checklist") {
      h2 = "Monthly Compliance Checklist FY 2024-25";
      body = `<p class="lead">Never miss a deadline again. This checklist covers all mandatory filings for Indian companies.</p>
      <div class="grid">
        <div class="card"><h3>GST Returns</h3><p>GSTR-1 by 11th, GSTR-3B by 20th of every month.</p></div>
        <div class="card"><h3>TDS Payments</h3><p>Due by the 7th of the following month.</p></div>
        <div class="card"><h3>PF & ESI</h3><p>Contributions due by the 15th of the following month.</p></div>
        <div class="card"><h3>Advance Tax</h3><p>Installments on 15th of Jun, Sep, Dec, and Mar.</p></div>
      </div>`;
      filename = "Finovara_Compliance_Checklist.html";
    } else if (title === "Tax Guide 2025") {
      h2 = "Tax Guide & Budget 2025 Highlights";
      body = `<p class="lead">A comprehensive guide to the new tax regime changes and strategic planning tips.</p>
      <div class="grid">
        <div class="card"><h3>New Tax Regime</h3><p>Standard deduction increased, basic exemption limit revised.</p></div>
        <div class="card"><h3>Corporate Tax</h3><p>Surcharge reduced for manufacturing companies.</p></div>
        <div class="card"><h3>Capital Gains</h3><p>Rationalization of holding periods across asset classes.</p></div>
        <div class="card"><h3>Startup Exemptions</h3><p>Tax holiday extended for DPIIT registered startups by 1 year.</p></div>
      </div>`;
      filename = "Finovara_Tax_Guide_2025.html";
    } else if (title === "Startup Handbook") {
      h2 = "Startup Incorporation & Compliance Handbook";
      body = `<p class="lead">A step-by-step guide for founders to incorporate and maintain full compliance.</p>
      <div class="grid">
        <div class="card"><h3>Incorporation</h3><p>Choosing between Private Limited vs LLP.</p></div>
        <div class="card"><h3>Initial Filings</h3><p>Commencement of business (INC-20A) and auditor appointment (ADT-1).</p></div>
        <div class="card"><h3>DPIIT Registration</h3><p>Process and benefits of being a recognized startup.</p></div>
        <div class="card"><h3>Funding Compliance</h3><p>FEMA guidelines and private placement rules under Companies Act.</p></div>
      </div>`;
      filename = "Finovara_Startup_Handbook.html";
    }

    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} | Finovara</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #102A43; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 42px; margin: 0; font-weight: 800; }
    .container { max-width: 900px; margin: -40px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #102A43; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); }
    .card h3 { font-size: 22px; margin-top: 0; color: #102A43; font-family: 'Manrope', sans-serif; }
    .card p { line-height: 1.6; color: #52606D; margin-bottom: 0; }
    .footer { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #EEF1F5; color: #52606D; font-size: 14px; line-height: 1.6; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="header">
    <h1>Finovara Resources</h1>
  </div>
  <div class="container">
    <h2>${h2}</h2>
    ${body}
    <div class="footer">
      <strong>Finovara Chartered Accountants LLP</strong><br>
      A global standard of financial excellence and integrity.<br><br>
      Contact: contact@finovara.in | +91 98765 43210 | www.finovara.in
    </div>
  </div>
</body>
</html>`;
  }

  const element = document.createElement("a");
  const file = new Blob([htmlContent], {type: 'text/html'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

function Navbar({ currentPage, setPage }: { currentPage: Page; setPage: (p: Page) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBase = "bg-white/5 shadow-sm border-b border-white/10";
  const textColor = "text-white";
  const logoColor = "#102A43";

  return (
    <nav className={`relative w-full z-50 transition-all duration-300 ${navBase}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo */}
          <button onClick={() => setPage("home")} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg leading-none" style={{ fontFamily: "Manrope", color: logoColor }}>
                Finovara
              </span>
              <span className="text-xs leading-none mt-0.5 font-medium tracking-wider uppercase" style={{ color: currentPage === "home" && !scrolled ? "rgba(255,255,255,0.7)" : "#52606D" }}>
                Chartered Accountants LLP
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative"
                onMouseEnter={() => item.children && setDropdown(item.label)}
                onMouseLeave={() => setDropdown(null)}>
                {item.isButton ? (
                  <button onClick={() => setPage(item.page)}
                    className={`ml-2 mr-1 text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${currentPage === "home" && !scrolled ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white hover:bg-[#102A43]/5"}`}
                    style={{ fontFamily: "Inter" }}>
                    {item.label}
                  </button>
                ) : (
                  <button
                    onClick={() => !item.children && setPage(item.page)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${textColor} hover:bg-black/5`}
                    style={{ fontFamily: "Inter" }}>
                    {item.label}
                    {item.children && <ChevronDown size={14} className={`transition-transform ${dropdown === item.label ? "rotate-180" : ""}`} />}
                  </button>
                )}
                {item.children && dropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white/5 rounded-2xl shadow-2xl border border-white/10 py-2 min-w-[180px] z-50">
                    {item.children.map(child => (
                      <button key={child.label} onClick={() => { setPage(child.page); setDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#102A43] hover:text-[#087F5B] transition-colors font-medium"
                        style={{ fontFamily: "Inter" }}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className={`lg:hidden p-2 rounded-lg ${textColor}`}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white/5 border-t border-white/10 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              item.isButton ? (
                <div key={item.label} className="pt-2 pb-1 border-t border-white/10 mt-2 mb-2">
                  <button onClick={() => { setPage(item.page); setMenuOpen(false); }}
                    className="w-full py-3 rounded-xl border border-white/10 text-white font-semibold text-sm"
                    style={{ fontFamily: "Inter" }}>
                    {item.label}
                  </button>
                </div>
              ) : (
                <button key={item.label} onClick={() => { setPage(item.page); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-white font-medium hover:bg-[#102A43] transition-colors"
                  style={{ fontFamily: "Inter" }}>
                  {item.label}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function AnnouncementBar({ setPage }: { setPage: (p: Page) => void }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2 text-xs font-medium relative" style={{ background: "linear-gradient(90deg, #087F5B, #065a40)", color: "white" }}>
      <span style={{ fontFamily: "Inter" }}>
        <span className="font-semibold">New:</span> Budget 2025 — Key Changes Affecting Your Business.{" "}
        <button onClick={() => setPage("insights")} className="underline underline-offset-2 hover:no-underline">Read Our Analysis →</button>
      </span>
      <button onClick={() => setVisible(false)} className="absolute right-4 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function ArticleModal({ article, onClose }: { article: any, onClose: () => void }) {
  if (!article) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/5 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-black/50 hover:text-black">
          <X size={24} />
        </button>
        <div className="mb-6">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EAF4F0] text-[#087F5B] mb-4 inline-block" style={{ fontFamily: "Inter" }}>{article.tag}</span>
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>{article.title}</h2>
          <div className="flex items-center gap-4 text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime}</span>
          </div>
        </div>
        <div className="h-64 rounded-xl overflow-hidden mb-8 bg-[#EEF1F5]">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop" alt="Article Cover" className="w-full h-full object-cover" />
        </div>
        <div className="text-sm" style={{ fontFamily: "Inter", color: "white", lineHeight: 1.8 }}>
          <p className="text-lg font-medium mb-6 text-[#94A3B8]">{article.excerpt}</p>
          <p className="mb-4">This is a full dynamic view for the article. In a production environment, this would load the complete rich-text content from a CMS. For now, it dynamically adapts to the title and tags of the insight you clicked.</p>
          <h3 className="text-lg font-bold mt-8 mb-4">Key Takeaways</h3>
          <ul className="list-disc pl-5 mb-6 space-y-2 text-[#94A3B8]">
            <li>Detailed compliance requirements for the upcoming financial year.</li>
            <li>Strategic insights on minimizing tax liability through proper structuring.</li>
            <li>Updates on the latest regulatory changes affecting mid-sized enterprises.</li>
          </ul>
          <button onClick={onClose} className="mt-6 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 w-full" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
            Close Article
          </button>
        </div>
      </div>
    </div>
  );
}

function HomePage({ setPage }: { setPage: (p: Page, hash?: string) => void }) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsStarted, setStatsStarted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsStarted(true); },
      { threshold: 0.2 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1d2e 0%, #102A43 50%, #0d3355 100%)" }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "48px 48px" }} />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10"
          style={{ background: "radial-gradient(ellipse at top right, #087F5B, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-10"
          style={{ background: "radial-gradient(ellipse at bottom left, #C8A45D, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#087F5B" }} />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70" style={{ fontFamily: "Inter" }}>
                Chartered Accountants & Financial Advisors
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] mb-6" style={{ fontFamily: "Manrope" }}>
              Financial Clarity for{" "}
              <span style={{ color: "#C8A45D", fontFamily: "Playfair Display", fontStyle: "italic" }}>Confident</span>{" "}
              Business Decisions
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl" style={{ fontFamily: "Inter" }}>
              Professional Tax, Audit, GST, Accounting, Payroll, Compliance, and Virtual CFO solutions delivered through expert guidance and secure digital workflows.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => setPage("book")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:shadow-2xl hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Calendar size={18} />
                Book Consultation
              </button>
              <button onClick={() => setPage("services")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/20 text-white hover:bg-white/10"
                style={{ fontFamily: "Inter" }}>
                Explore Services
                <ChevronRight size={18} />
              </button>
              <button onClick={() => setPage("login")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "Inter" }}>
                <Lock size={16} />
                Client Login
              </button>
              <button onClick={() => setPage("login")}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "Inter" }}>
                <UploadCloud size={16} />
                Upload Documents
              </button>
              <button onClick={() => {
                const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finovara Firm Profile</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #102A43; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px 80px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 52px; margin: 0; font-weight: 800; }
    .header p { font-size: 20px; opacity: 0.8; margin-top: 10px; font-weight: 500; }
    .container { max-width: 900px; margin: -60px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    .hero-img { width: 100%; height: 350px; object-fit: cover; border-radius: 16px; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #102A43; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); transition: transform 0.2s; }
    .card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .card h3 { font-size: 22px; margin-top: 0; color: #102A43; font-family: 'Manrope', sans-serif; }
    .card p { line-height: 1.6; color: #52606D; margin-bottom: 0; }
    .stats { display: flex; justify-content: space-around; background: linear-gradient(135deg, #087F5B, #065a40); color: white; padding: 40px 20px; border-radius: 16px; margin-top: 50px; box-shadow: 0 15px 30px rgba(8,127,91,0.2); }
    .stat-item { text-align: center; }
    .stat-val { font-size: 42px; font-weight: 800; font-family: 'Manrope', sans-serif; margin-bottom: 5px; }
    .stat-lbl { font-size: 15px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .footer { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #EEF1F5; color: #52606D; font-size: 14px; line-height: 1.6; }
    .badges { display: flex; justify-content: center; gap: 15px; margin-bottom: 15px; }
    .badge { background: #EAF4F0; color: #087F5B; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="header">
    <h1>Finovara</h1>
    <p>Chartered Accountants LLP</p>
  </div>
  <div class="container">
    <div class="badges">
      <span class="badge">ICAI Registered</span>
      <span class="badge">ISO 27001 Certified</span>
      <span class="badge">Established 2010</span>
    </div>
    
    <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=600&fit=crop" class="hero-img" alt="Finovara Office">
    
    <h2>About Our Firm</h2>
    <p class="lead">Finovara Chartered Accountants LLP is a premier financial and advisory firm committed to delivering excellence. With over 15 years of experience, we provide a comprehensive suite of services ranging from statutory audits and tax advisory to complex financial structuring and compliance management for enterprises across India.</p>
    
    <h2>Core Competencies</h2>
    <div class="grid">
      <div class="card">
        <h3>Audit & Assurance</h3>
        <p>Robust auditing services ensuring compliance, transparency, and actionable financial insights for private and public companies.</p>
      </div>
      <div class="card">
        <h3>Tax Advisory</h3>
        <p>Strategic tax planning, assessment, and compliance for both direct (Income Tax) and indirect taxation (GST & Customs).</p>
      </div>
      <div class="card">
        <h3>Corporate Finance</h3>
        <p>Expert guidance on capital structuring, mergers, acquisitions, due diligence, and comprehensive business valuations.</p>
      </div>
      <div class="card">
        <h3>Virtual CFO</h3>
        <p>End-to-end financial management, rigorous budgeting, and strategic forecasting tailored for rapidly growing businesses.</p>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-val">15+</div>
        <div class="stat-lbl">Years Experience</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">1,500+</div>
        <div class="stat-lbl">Active Clients</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">4,000+</div>
        <div class="stat-lbl">Tax Filings</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">100%</div>
        <div class="stat-lbl">Compliance</div>
      </div>
    </div>
    
    <div class="footer">
      <strong>Finovara Chartered Accountants LLP</strong><br>
      A global standard of financial excellence and integrity.<br><br>
      Contact: contact@finovara.in | +91 98765 43210 | www.finovara.in
    </div>
  </div>
</body>
</html>`;
                const element = document.createElement("a");
                const file = new Blob([htmlContent], {type: 'text/html'});
                element.href = URL.createObjectURL(file);
                element.download = "Finovara_Firm_Profile.html";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
                className="flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base transition-all border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "Inter" }}>
                <Download size={16} />
                Download Firm Profile
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-white/10">
              {["ICAI Registered", "ISO 27001 Certified", "15+ Years Experience"].map(badge => (
                <div key={badge} className="flex items-center gap-2">
                  <CheckCircle size={16} style={{ color: "#087F5B" }} />
                  <span className="text-sm text-white/60 font-medium" style={{ fontFamily: "Inter" }}>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side — portal preview */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                {/* Portal header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <span className="text-white/50 text-xs font-medium tracking-wide" style={{ fontFamily: "Inter" }}>portal.finovara.in</span>
                  <Lock size={14} className="text-white/30" />
                </div>
                <div className="p-6">
                  <div className="text-white/50 text-xs mb-4 uppercase tracking-widest" style={{ fontFamily: "Inter" }}>Dashboard Overview</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Compliance Score", value: "98%", color: "#087F5B", icon: Shield },
                      { label: "Pending Tasks", value: "3", color: "#C8A45D", icon: Bell },
                      { label: "Documents", value: "247", color: "white", icon: Folder },
                      { label: "Due This Month", value: "₹1.2L", color: "#2F9E44", icon: Calendar },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} className="rounded-2xl p-4 bg-white/5 border border-white/5">
                        <Icon size={16} style={{ color }} className="mb-2" />
                        <div className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Manrope" }}>{value}</div>
                        <div className="text-xs text-white/40" style={{ fontFamily: "Inter" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl p-4 bg-white/5 border border-white/5">
                    <div className="text-xs text-white/40 mb-3 uppercase tracking-wider" style={{ fontFamily: "Inter" }}>Recent Activity</div>
                    {["ITR Filed — FY 2024-25", "GST Return Submitted", "TDS Certificate Uploaded"].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <CheckCircle size={14} style={{ color: "#087F5B" }} />
                        <span className="text-xs text-white/60" style={{ fontFamily: "Inter" }}>{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white/5 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                  <Shield size={16} style={{ color: "#087F5B" }} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white" style={{ fontFamily: "Manrope" }}>256-bit Encrypted</div>
                  <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Bank-grade security</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="#102A43" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-20" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Our Impact</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "Manrope" }}>Numbers That Define Our Excellence</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((s) => (
              <StatCard key={s.label} value={s.value} suffix={s.suffix} label={s.label} started={statsStarted} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Finovara */}
      <section className="py-24" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Why Finovara</p>
            <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight" style={{ fontFamily: "Manrope" }}>
              The Standard for Modern{" "}
              <span style={{ color: "#087F5B" }}>Financial Advisory</span>
            </h2>
            <p className="text-[#94A3B8] text-lg leading-relaxed" style={{ fontFamily: "Inter" }}>
              We combine deep domain expertise with secure digital infrastructure to deliver compliance and advisory services that keep your business ahead.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#087F5B]/50 hover:shadow-2xl hover:shadow-[#087F5B]/20 transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ background: "#EAF4F0" }}>
                  <Icon size={22} style={{ color: "#087F5B" }} />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg" style={{ fontFamily: "Manrope" }}>{title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>What We Do</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Core Service Offerings</h2>
            <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
              Comprehensive financial and compliance services, delivered by qualified professionals with sector-specific expertise.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title}
                onMouseEnter={() => setActiveService(i)}
                className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-300 ${activeService === i ? "border-[#087F5B] shadow-xl scale-105" : "border-white/10 hover:border-[#087F5B]/30"}`}
                style={{ background: activeService === i ? "linear-gradient(135deg, #102A43, #0d3355)" : "white" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: activeService === i ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                  <Icon size={20} style={{ color: activeService === i ? "#C8A45D" : "#087F5B" }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ fontFamily: "Manrope", color: activeService === i ? "white" : "#102A43" }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ fontFamily: "Inter", color: activeService === i ? "rgba(255,255,255,0.6)" : "#52606D" }}>{desc}</p>
                {activeService === i && (
                  <button onClick={() => setPage("services")} className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: "#C8A45D" }}>
                    Learn More <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => setPage("services")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm hover:bg-[#087F5B] hover:text-white transition-all"
              style={{ fontFamily: "Inter" }}>
              View All Services <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Industries</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Sectors We Serve</h2>
            <p className="text-[#94A3B8] text-lg max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
              Deep domain knowledge across 15+ industries with tailored compliance and financial strategies.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => setPage("industries")}
                className="group flex flex-col items-center gap-3 p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-[#087F5B]/50 hover:shadow-2xl hover:shadow-[#087F5B]/20 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                  <Icon size={22} style={{ color: "#087F5B" }} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold text-center text-white" style={{ fontFamily: "Manrope" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-24 bg-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Our Process</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>How We Deliver Excellence</h2>
            <p className="text-[#94A3B8] text-lg max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
              A transparent, structured workflow that keeps you informed at every step.
            </p>
          </div>
          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-0.5 hidden lg:block" style={{ background: "linear-gradient(90deg, transparent, #EEF1F5, #087F5B30, #EEF1F5, transparent)" }} />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {WORKFLOW.map(({ step, title, desc }, i) => (
                <div key={step} className="flex flex-col items-center text-center group">
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2 border-[#087F5B]/20 bg-white/5 shadow-sm group-hover:border-[#087F5B] group-hover:shadow-md transition-all z-10"
                    style={{ background: i % 2 === 0 ? "white" : "#102A43" }}>
                    <span className="font-bold text-lg" style={{ fontFamily: "Manrope", color: "#087F5B" }}>{step}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1" style={{ fontFamily: "Manrope" }}>{title}</h4>
                  <p className="text-xs text-[#94A3B8] leading-relaxed hidden md:block" style={{ fontFamily: "Inter" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Client Portal Preview */}
      <section className="py-24 overflow-hidden" style={{ background: "linear-gradient(135deg, #102A43 0%, #0d3355 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Portal</p>
            <h2 className="text-4xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              Your Financial Hub,<br />
              <span style={{ color: "#087F5B" }}>Always Accessible</span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              A secure, feature-rich portal giving you real-time visibility into compliance status, document management, and service progress.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: BarChart2, label: "Live Dashboard" },
                { icon: Folder, label: "Document Vault" },
                { icon: Calendar, label: "Compliance Calendar" },
                { icon: FileText, label: "Report Center" },
                { icon: Bell, label: "Smart Alerts" },
                { icon: Shield, label: "Secure Uploads" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.2)" }}>
                    <Icon size={16} style={{ color: "#087F5B" }} />
                  </div>
                  <span className="text-sm font-medium text-white/80" style={{ fontFamily: "Inter" }}>{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setPage("login")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Access Your Portal <ArrowRight size={16} />
            </button>
          </div>
          <div className="hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&fit=crop&auto=format"
              alt="Financial dashboard showing analytics and compliance tracking"
              className="rounded-3xl shadow-2xl border border-white/10 w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured Advisory Assignments */}
      <section className="py-24" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Case Studies</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Featured Advisory Assignments</h2>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>Real-world impact delivered through strategic financial expertise.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURED_ASSIGNMENTS.map((assignment, i) => (
              <div key={i} className="bg-white/5 rounded-3xl p-8 border border-white/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6" style={{ background: "linear-gradient(135deg, #087F5B15, #087F5B30)", color: "#087F5B", fontFamily: "Inter" }}>
                  {assignment.tag}
                </span>
                <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>{assignment.title}</h3>
                <p className="text-[#94A3B8] mb-8 leading-relaxed text-sm" style={{ fontFamily: "Inter" }}>{assignment.desc}</p>
                <div className="pt-6 border-t border-white/10 mt-auto">
                  <div className="text-xs text-[#94A3B8] mb-1" style={{ fontFamily: "Inter" }}>Key Outcome</div>
                  <div className="font-bold text-[#087F5B]" style={{ fontFamily: "Manrope" }}>{assignment.metric}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Client Stories</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Trusted by Industry Leaders</h2>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-[#102A43] rounded-3xl p-8 md:p-12 border border-white/10">
              <Quote size={40} style={{ color: "#087F5B" }} className="mb-6 opacity-30" />
              <p className="text-xl md:text-2xl text-white leading-relaxed mb-8 font-medium" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>
                "{TESTIMONIALS[activeTestimonial].text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                  {TESTIMONIALS[activeTestimonial].avatar}
                </div>
                <div>
                  <div className="font-bold text-white" style={{ fontFamily: "Manrope" }}>{TESTIMONIALS[activeTestimonial].name}</div>
                  <div className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{TESTIMONIALS[activeTestimonial].role}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === activeTestimonial ? 24 : 8, height: 8, background: i === activeTestimonial ? "#087F5B" : "#E2E8F0" }} />
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setPage("testimonials")}
              className="text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
              Read All Testimonials →
            </button>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section className="py-24" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Knowledge Hub</p>
              <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Latest Insights</h2>
            </div>
            <button onClick={() => setPage("insights")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
              View All Articles <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIGHTS.map((article) => (
              <div key={article.title} className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 overflow-hidden bg-[#EEF1F5]">
                  <img
                    src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format"
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>
                      {article.tag}
                    </span>
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.date}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2 text-lg leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.readTime}</span>
                    <button onClick={() => setSelectedArticle(article)} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
                      Read More <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Free Resources</p>
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Tools & Downloads</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Download, title: "Firm Profile", desc: "Complete overview of Finovara services and expertise", badge: "PDF" },
              { icon: FileCheck, title: "Compliance Checklist", desc: "Monthly compliance calendar for FY 2024-25", badge: "Checklist" },
              { icon: FileText, title: "Tax Guide 2025", desc: "Comprehensive guide to new tax regime changes", badge: "Guide" },
              { icon: BookOpen, title: "Startup Handbook", desc: "Step-by-step incorporation and compliance guide", badge: "Handbook" },
            ].map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} onClick={() => handleDownloadResource(title)} className="group relative bg-[#102A43] rounded-2xl p-6 border border-white/10 hover:border-[#087F5B]/20 hover:shadow-lg transition-all cursor-pointer">
                <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>
                  {badge}
                </div>
                <Icon size={28} style={{ color: "#087F5B" }} className="mb-4" />
                <h4 className="font-bold text-white mb-2" style={{ fontFamily: "Manrope" }}>{title}</h4>
                <p className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{desc}</p>
                <button className="flex items-center gap-1 mt-4 text-xs font-semibold text-[#087F5B]" style={{ fontFamily: "Inter" }}>
                  Download Free <Download size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Calendars */}
      <section className="py-24 bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Stay Compliant</p>
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Upcoming Compliance Deadlines</h2>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>Never miss a deadline. Keep track of crucial tax and regulatory filings.</p>
          </div>
          <div className="max-w-4xl mx-auto bg-[#102A43] rounded-3xl p-8 border border-white/10 shadow-sm">
            <div className="space-y-4">
              {COMPLIANCE_CALENDAR.map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#087F5B]/30 transition-all hover:shadow-md">
                  <div className="flex-shrink-0 text-center md:w-32 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4">
                    <div className="text-3xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{item.date.split(' ')[0]}</div>
                    <div className="text-sm font-semibold text-[#087F5B] uppercase tracking-wide" style={{ fontFamily: "Inter" }}>{item.date.split(' ')[1]}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-white text-lg" style={{ fontFamily: "Manrope" }}>{item.task}</h4>
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{item.type}</span>
                    </div>
                    <p className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{item.desc}</p>
                  </div>
                  <button onClick={() => handleAddCalendar(item)} className="self-start md:self-center px-4 py-2 rounded-xl text-xs font-semibold border-2 border-[#087F5B] text-[#087F5B] hover:bg-[#087F5B] hover:text-white transition-all flex-shrink-0" style={{ fontFamily: "Inter" }}>
                    Add to Calendar
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center border-t border-white/10 pt-8">
              <button onClick={() => handleDownloadResource("Compliance Checklist")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 shadow-md hover:shadow-xl" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Download size={16} /> Download Full FY24-25 Calendar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24" style={{ background: "#102A43" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>FAQs</p>
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left group">
                  <span className="font-semibold text-white pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                  <div className="flex-shrink-0">
                    {openFaq === i ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setPage("faqs")}
              className="text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>
              View All FAQs →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #087F5B 0%, #065a40 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-white/10 border border-white/20">
            <Calendar size={14} className="text-white/70" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70" style={{ fontFamily: "Inter" }}>Free Consultation</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
            Ready to Transform Your<br />
            <span style={{ fontFamily: "Playfair Display", fontStyle: "italic", color: "#C8A45D" }}>Financial Strategy?</span>
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto" style={{ fontFamily: "Inter" }}>
            Schedule a no-obligation consultation with our senior advisors. Get expert guidance tailored to your business in 30 minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setPage("book")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 font-semibold text-[#087F5B] text-base hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ fontFamily: "Inter" }}>
              <Calendar size={18} />
              Book Free Consultation
            </button>
            <button onClick={() => setPage("contact")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all"
              style={{ fontFamily: "Inter" }}>
              <Phone size={18} />
              Call Us Now
            </button>
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}

function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  const team = [
    { name: "CA Arjun Mehta", role: "Managing Partner", exp: "22 Years", spec: "Direct Tax & Audit", initials: "AM" },
    { name: "CA Priya Nair", role: "Senior Partner", exp: "18 Years", spec: "GST & Indirect Tax", initials: "PN" },
    { name: "CA Suresh Kumar", role: "Partner – Advisory", exp: "15 Years", spec: "Virtual CFO & Strategy", initials: "SK" },
    { name: "CA Divya Rao", role: "Partner – Audit", exp: "14 Years", spec: "Audit & Assurance", initials: "DR" },
  ];

  const values = [
    { icon: Shield, title: "Integrity", desc: "We operate with absolute transparency and ethical standards in every client engagement." },
    { icon: Award, title: "Excellence", desc: "We hold ourselves to the highest professional standards, continuously raising the bar." },
    { icon: Users, title: "Client-First", desc: "Every decision, process, and innovation is driven by what's best for our clients." },
    { icon: Zap, title: "Innovation", desc: "We leverage technology to deliver faster, smarter, and more secure financial services." },
  ];

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>About Finovara</p>
            <h1 className="text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              A Decade of Financial{" "}
              <span style={{ color: "#087F5B" }}>Excellence</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-6" style={{ fontFamily: "Inter" }}>
              Finovara Chartered Accountants LLP was founded with a singular mission: to democratise access to world-class financial advisory services for businesses of every size.
            </p>
            <p className="text-white/60 leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              From our foundation as a boutique tax practice, we have grown into a comprehensive financial services firm with 65+ professionals serving 1,500+ clients across 15 sectors. Our journey has been defined by one unwavering principle: putting our clients' financial health first.
            </p>
            <button onClick={() => setPage("book")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Meet Our Team <ArrowRight size={16} />
            </button>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=450&fit=crop&auto=format"
              alt="Finovara team in a professional office setting"
              className="rounded-3xl shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Vision Mission */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 border border-white/10" style={{ background: "#EAF4F0" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#087F5B" }}>
              <Target size={22} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Our Vision</h3>
            <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>
              To be India's most trusted financial advisory firm, empowering businesses with the clarity, compliance, and strategic insight needed to achieve sustainable growth.
            </p>
          </div>
          <div className="rounded-3xl p-8 border border-white/10" style={{ background: "#F7F4EE" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#C8A45D" }}>
              <Lightbulb size={22} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Our Mission</h3>
            <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>
              To deliver exceptional, technology-enabled financial and compliance services with absolute integrity, helping clients navigate complexity and make decisions with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Core Values</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:shadow-lg transition-all text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EAF4F0" }}>
                  <Icon size={24} style={{ color: "#087F5B" }} />
                </div>
                <h4 className="font-bold text-white mb-2 text-lg" style={{ fontFamily: "Manrope" }}>{title}</h4>
                <p className="text-sm text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#087F5B", fontFamily: "Inter" }}>Leadership</p>
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Our Senior Partners</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map(({ name, role, exp, spec, initials }) => (
              <div key={name} className="group bg-[#102A43] rounded-2xl p-6 border border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white mb-4"
                  style={{ background: "linear-gradient(135deg, #102A43, #087F5B)", fontFamily: "Manrope" }}>
                  {initials}
                </div>
                <h4 className="font-bold text-white mb-1" style={{ fontFamily: "Manrope" }}>{name}</h4>
                <p className="text-sm font-medium mb-2" style={{ color: "#087F5B", fontFamily: "Inter" }}>{role}</p>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} style={{ color: "#94A3B8" }} />
                  <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{exp} Experience</span>
                </div>
                <p className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{spec}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>Our Offices</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { city: "Mumbai", type: "Head Office", address: "Level 12, One BKC, Bandra Kurla Complex, Mumbai 400051", phone: "+91 22 6789 0123" },
              { city: "Bangalore", type: "South Hub", address: "Embassy GolfLinks, Off Intermediate Ring Road, Bengaluru 560071", phone: "+91 80 4567 8901" },
              { city: "Delhi", type: "North Office", address: "Worldmark 1, Aerocity, New Delhi 110037", phone: "+91 11 4567 8901" },
            ].map(({ city, type, address, phone }) => (
              <div key={city} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                    <MapPin size={18} style={{ color: "#087F5B" }} />
                  </div>
                  <div>
                    <div className="font-bold text-white" style={{ fontFamily: "Manrope" }}>{city}</div>
                    <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{type}</div>
                  </div>
                </div>
                <p className="text-sm text-[#94A3B8] mb-3 leading-relaxed" style={{ fontFamily: "Inter" }}>{address}</p>
                <div className="flex items-center gap-2 text-sm" style={{ color: "#087F5B", fontFamily: "Inter" }}>
                  <Phone size={14} />
                  <span>{phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ServicesPage({ setPage }: { setPage: (p: Page) => void }) {
  const [selected, setSelected] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const service = SERVICES[selected];

  useEffect(() => {
    setActiveStep(0);
  }, [selected]);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Our Services</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Comprehensive Financial Services</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
            End-to-end financial and compliance solutions delivered by qualified professionals with deep sector expertise.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Service List */}
            <div className="space-y-2">
              {SERVICES.map(({ icon: Icon, title }, i) => (
                <button key={title} onClick={() => setSelected(i)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all ${selected === i ? "shadow-lg" : "hover:bg-[#102A43]"}`}
                  style={{ background: selected === i ? "linear-gradient(135deg, #102A43, #0d3355)" : "transparent" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: selected === i ? "rgba(255,255,255,0.1)" : "#EAF4F0" }}>
                    <Icon size={18} style={{ color: selected === i ? "#C8A45D" : "#087F5B" }} />
                  </div>
                  <span className="font-semibold text-sm" style={{ fontFamily: "Manrope", color: selected === i ? "white" : "#102A43" }}>{title}</span>
                  {selected === i && <ChevronRight size={16} className="ml-auto text-white/50" />}
                </button>
              ))}
            </div>

            {/* Service Detail */}
            <div className="lg:col-span-2">
              <div className="bg-[#102A43] rounded-3xl p-8 border border-white/10 h-full">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#EAF4F0" }}>
                  <service.icon size={26} style={{ color: "#087F5B" }} />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>{service.title}</h2>
                <p className="text-[#94A3B8] text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>{service.desc}</p>

                {"features" in service && service.features && (
                  <div className="mb-8">
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Features</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {service.features.map((f: string) => (
                        <div key={f} className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                          <CheckCircle size={16} style={{ color: "#087F5B" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Inter" }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {"portalFeatures" in service && service.portalFeatures && (
                  <div className="mb-8">
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Portal Features</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {service.portalFeatures.map((pf: string) => (
                        <div key={pf} className="flex items-start gap-2 bg-[#102A43]/5 p-3 rounded-xl border border-white/10">
                          <CheckCircle size={16} style={{ color: "#C8A45D" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Inter" }}>{pf}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Key Benefits</h4>
                    <div className="space-y-2">
                      {["Expert handling by qualified CAs", "100% regulatory compliance", "Transparent pricing & timelines", "Dedicated relationship manager"].map(b => (
                        <div key={b} className="flex items-start gap-2">
                          <CheckCircle size={16} style={{ color: "#087F5B" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-3" style={{ fontFamily: "Manrope" }}>Deliverables</h4>
                    <div className="space-y-2">
                      {(("deliverables" in service && service.deliverables) || ["Comprehensive compliance filings", "Detailed advisory reports", "Digital document delivery", "Ongoing compliance monitoring"]).map((d: string) => (
                        <div key={d} className="flex items-start gap-2">
                          <FileCheck size={16} style={{ color: "#C8A45D" }} className="mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {"workflow" in service && service.workflow && (
                  <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="font-bold text-white mb-4" style={{ fontFamily: "Manrope" }}>Audit Workflow</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {service.workflow.map((item: any, idx: number) => (
                        <div key={item.step} className="flex items-center gap-2">
                          <button onClick={() => setActiveStep(idx)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-sm hover:shadow-md group ${activeStep === idx ? "bg-[#EAF4F0] border-[#087F5B] scale-105" : "bg-[#102A43] border-white/10 hover:bg-[#EAF4F0] hover:border-[#087F5B]/30 hover:-translate-y-0.5"}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-transform group-hover:scale-110 ${activeStep === idx ? "shadow-md" : ""}`} style={{ background: "#087F5B" }}>
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-white" style={{ fontFamily: "Inter" }}>{item.step}</span>
                          </button>
                          {idx < service.workflow.length - 1 && (
                            <ArrowRight size={14} className="text-[#087F5B]/50" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-[#102A43] p-4 rounded-xl border border-white/10">
                       <h5 className="font-bold text-white text-sm mb-1" style={{ fontFamily: "Manrope" }}>Step {activeStep + 1}: {service.workflow[activeStep].step}</h5>
                       <p className="text-sm text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{service.workflow[activeStep].desc}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setPage("book")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                  Book a Consultation <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const INDUSTRY_DETAILS: Record<string, { services: string[]; compliance: string[]; color: string }> = {
  "Information Technology": { services: ["Transfer Pricing", "ESOPs & Sweat Equity", "GST on SaaS/Software", "R&D Tax Credits", "Startup DPIIT Registration"], compliance: ["Income Tax", "GST", "TDS", "ROC Filings", "FEMA"], color: "#087F5B" },
  "Manufacturing": { services: ["Cost Accounting", "Excise & Custom Duty", "Inventory Audit", "Transfer Pricing", "Factory Payroll"], compliance: ["GST", "Customs", "ESI & PF", "Factory Act", "Tax Audit"], color: "#065a40" },
  "Construction": { services: ["Project-wise Accounting", "GST on Works Contract", "TDS on Contractors", "Joint Venture Compliance", "Labour Payroll"], compliance: ["GST", "TDS", "Income Tax", "RERA", "Labour Laws"], color: "white" },
  "Real Estate": { services: ["Project Accounting", "GST on Sale/Lease", "JDA Tax Advisory", "Capital Gains Planning", "RERA Compliance"], compliance: ["RERA", "GST", "Income Tax", "TDS", "Stamp Duty"], color: "#0d3355" },
  "Healthcare": { services: ["Multi-entity Consolidation", "GST on Healthcare", "Pharmacy Accounting", "NABH Compliance", "Trust & NPO Tax"], compliance: ["GST", "Income Tax", "Clinical Establishment Act", "NABH", "TDS"], color: "#087F5B" },
  "Education": { services: ["Trust & Society Accounting", "80G & 12A Registration", "GST on Education", "Fee Structure Advisory", "Donor Reporting"], compliance: ["Income Tax", "GST", "TDS", "FCRA", "Trust Laws"], color: "#065a40" },
  "E-commerce": { services: ["TCS Compliance", "GST for Marketplace Sellers", "Platform Commission Advisory", "Multi-state GST", "Inventory & Returns Accounting"], compliance: ["GST TCS", "Income Tax", "TDS", "Consumer Protection", "FEMA"], color: "white" },
  "Retail": { services: ["GST Return Filing", "Point-of-Sale Reconciliation", "Inventory Accounting", "Multi-location Payroll", "Stock Audit"], compliance: ["GST", "Income Tax", "Labour Laws", "Shops Act", "ESI & PF"], color: "#087F5B" },
  "Hospitality": { services: ["Hotel GST Advisory", "F&B Accounting", "Staff Payroll & ESI", "Revenue Accounting", "Licencing Compliance"], compliance: ["GST", "Tourism Act", "ESI & PF", "FSSAI", "Income Tax"], color: "#065a40" },
  "Logistics": { services: ["Fleet Depreciation", "GST on Transport", "Route-wise P&L", "Driver Payroll", "Freight Invoice Audit"], compliance: ["GST", "TDS", "Motor Vehicles Act", "ESI & PF", "Income Tax"], color: "white" },
  "Pharmaceuticals": { services: ["Drug Pricing Advisory", "R&D Deductions", "Transfer Pricing", "Export Incentives", "Regulatory Filing Support"], compliance: ["GST", "Income Tax", "Drugs Act", "FEMA", "Transfer Pricing"], color: "#087F5B" },
  "Professional Services": { services: ["Partnership Tax Returns", "LLP Compliance", "Professional GST", "Advance Tax Planning", "TDS on Professional Fees"], compliance: ["Income Tax", "GST", "TDS", "ROC", "RERA (if applicable)"], color: "#065a40" },
  "Startups": { services: ["DPIIT Registration", "80IAC Tax Exemption", "ESOP Structuring", "Cap Table Management", "Investor-Ready Financials"], compliance: ["Income Tax", "GST", "ROC", "FEMA", "Labour Laws"], color: "#087F5B" },
  "NGOs": { services: ["80G & 12A Registration", "FCRA Compliance", "Grant Accounting", "Donor Reporting", "Trust Audit"], compliance: ["Income Tax", "FCRA", "TDS", "GST (if applicable)", "Trust Laws"], color: "white" },
  "Export Businesses": { services: ["GST Refund (LUT/IGST)", "FEMA & RBI Compliance", "Transfer Pricing", "Export Incentives (RoDTEP)", "Advance Licence Advisory"], compliance: ["FEMA", "GST", "Customs", "Income Tax", "Transfer Pricing"], color: "#065a40" },
  "Financial Services": { services: ["NBFC Compliance", "RBI Reporting", "Investment Advisory Tax", "Loan Portfolio Audit", "KYC & AML Support"], compliance: ["RBI", "SEBI", "Income Tax", "GST", "FEMA"], color: "#0d3355" },
};

function IndustriesPage({ setPage }: { setPage: (p: Page) => void }) {
  const [activeIndustry, setActiveIndustry] = useState<string>(INDUSTRIES[0].label);

  const activeIcon = INDUSTRIES.find(i => i.label === activeIndustry);
  const details = INDUSTRY_DETAILS[activeIndustry];

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Industries</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Sectors We Specialise In</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto" style={{ fontFamily: "Inter" }}>
            Industry-specific financial expertise across 16 sectors, with dedicated teams who understand your regulatory landscape.
          </p>
        </div>
      </section>

      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Industry Filter Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setActiveIndustry(label)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  activeIndustry === label
                    ? "text-white border-transparent shadow-lg scale-105"
                    : "bg-white/5 text-white border-white/10 hover:border-[#087F5B]/30 hover:bg-[#EAF4F0]"
                }`}
                style={activeIndustry === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
              >
                <Icon size={15} style={{ color: activeIndustry === label ? "white" : "#087F5B" }} />
                {label}
              </button>
            ))}
          </div>

          {/* Industry Detail Panel */}
          {details && activeIcon && (
            <div className="bg-white/5 rounded-3xl border border-white/10 shadow-xl overflow-hidden transition-all">
              {/* Panel Header */}
              <div className="p-8 border-b border-white/10" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.3)" }}>
                    <activeIcon.icon size={30} style={{ color: "#C8A45D" }} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{activeIndustry}</h2>
                    <p className="text-white/60 text-sm mt-1" style={{ fontFamily: "Inter" }}>
                      Specialized compliance, tax advisory, and financial management services tailored for {activeIndustry.toLowerCase()} businesses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Body */}
              <div className="p-8 grid md:grid-cols-2 gap-8">
                {/* Services */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                      <CheckCircle size={14} style={{ color: "#087F5B" }} />
                    </span>
                    Services We Offer
                  </h4>
                  <div className="space-y-2">
                    {details.services.map(s => (
                      <div key={s} className="flex items-center gap-3 p-3 bg-[#102A43] rounded-xl border border-white/10 hover:border-[#087F5B]/20 transition-colors">
                        <CheckCircle size={14} style={{ color: "#087F5B" }} className="flex-shrink-0" />
                        <span className="text-sm font-medium text-white" style={{ fontFamily: "Inter" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#FFF4E0" }}>
                      <Shield size={14} style={{ color: "#C8A45D" }} />
                    </span>
                    Compliance Areas
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {details.compliance.map(c => (
                      <span key={c} className="px-3 py-2 rounded-xl text-sm font-semibold border" style={{ background: "#102A43", color: "white", borderColor: "rgba(0,0,0,0.06)", fontFamily: "Inter" }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
                    <p className="text-white/70 text-sm mb-4" style={{ fontFamily: "Inter" }}>
                      Get dedicated {activeIndustry} expertise from our specialist team.
                    </p>
                    <button onClick={() => setPage("book")}
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                      Book a Free Consultation →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Don't See Your Industry?</h2>
          <p className="text-white/80 mb-8" style={{ fontFamily: "Inter" }}>We work with businesses across all sectors. Contact us to discuss your specific needs.</p>
          <button onClick={() => setPage("contact")}
            className="px-8 py-4 rounded-xl bg-white/5 text-[#087F5B] font-semibold hover:shadow-xl transition-all"
            style={{ fontFamily: "Inter" }}>
            Get in Touch
          </button>
        </div>
      </section>
    </div>
  );
}



function InsightsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const tabs = ["all", "Tax", "GST", "Audit", "Advisory", "Startup"];
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const displayInsights = activeTab === "all" 
    ? [...INSIGHTS, ...INSIGHTS].slice(0, 6)
    : [...INSIGHTS, ...INSIGHTS].filter(a => a.tag === activeTab).slice(0, 6);

  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Knowledge Hub</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Insights & Analysis</h1>
            <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>
              Expert commentary on tax, compliance, and financial strategy from our senior advisory team.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "#087F5B" : "white",
                  color: activeTab === tab ? "white" : "#52606D",
                  fontFamily: "Inter",
                  border: "1px solid",
                  borderColor: activeTab === tab ? "#087F5B" : "rgba(0,0,0,0.08)"
                }}>
                {tab === "all" ? "All Topics" : tab}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {displayInsights.map((article, i) => (
              <div key={i} className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 overflow-hidden bg-[#EEF1F5]">
                  <img
                    src={`https://images.unsplash.com/photo-${i % 2 === 0 ? "1554224155-6726b3ff858f" : "1486406146926-c627a92ad1ab"}?w=400&h=200&fit=crop&auto=format`}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>
                      {article.tag}
                    </span>
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.date}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2 text-lg leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{article.readTime}</span>
                    <button onClick={() => setSelectedArticle(article)} className="flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline">Read More <ArrowRight size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Article Modal */}
      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}

function TestimonialsPage() {
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Client Stories</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>What Our Clients Say</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Trusted by 1,500+ businesses across India</p>
        </div>
      </section>
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...TESTIMONIALS, ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:shadow-xl transition-all">
                <Quote size={28} style={{ color: "#087F5B" }} className="mb-4 opacity-30" />
                <p className="text-white leading-relaxed mb-6 text-sm" style={{ fontFamily: "Playfair Display", fontStyle: "italic" }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Manrope" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white" style={{ fontFamily: "Manrope" }}>{t.name}</div>
                    <div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{t.role}</div>
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={12} fill="#C8A45D" style={{ color: "#C8A45D" }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const allFaqs = [...FAQS, ...FAQS.slice(0, 4)];
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Help Center</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Frequently Asked Questions</h1>
        </div>
      </section>
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
          {allFaqs.map((faq, i) => (
            <div key={i} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="font-semibold text-white pr-4" style={{ fontFamily: "Manrope" }}>{faq.q}</span>
                {openFaq === i ? <ChevronUp size={20} style={{ color: "#087F5B" }} /> : <ChevronDown size={20} style={{ color: "#94A3B8" }} />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResourcesPage() {
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Downloads</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Free Resources</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>Tools, guides, and checklists to support your compliance journey</p>
        </div>
      </section>
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Firm Profile 2025", type: "PDF", size: "2.4 MB", desc: "Complete overview of Finovara services, team, and track record." },
              { title: "Tax Compliance Calendar FY 2024-25", type: "PDF", size: "1.1 MB", desc: "Month-by-month compliance deadline tracker." },
              { title: "Startup Compliance Checklist", type: "Excel", size: "0.8 MB", desc: "Complete checklist for new startup regulatory requirements." },
              { title: "GST Return Filing Guide", type: "PDF", size: "3.2 MB", desc: "Step-by-step guide to GST return preparation and filing." },
              { title: "Income Tax Planning Workbook", type: "Excel", size: "1.5 MB", desc: "Interactive workbook for optimizing tax liability." },
              { title: "Annual Audit Preparation Kit", type: "PDF", size: "4.1 MB", desc: "Comprehensive documents checklist for statutory audit." },
            ].map(({ title, type, size, desc }) => (
              <div key={title} className="group bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#087F5B]/20 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EAF4F0" }}>
                    <FileText size={22} style={{ color: "#087F5B" }} />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{type}</span>
                    <span className="text-xs text-[#94A3B8] px-2 py-1 rounded-lg bg-[#EEF1F5]" style={{ fontFamily: "Inter" }}>{size}</span>
                  </div>
                </div>
                <h3 className="font-bold text-white mb-2" style={{ fontFamily: "Manrope" }}>{title}</h3>
                <p className="text-sm text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>{desc}</p>
                <button className="flex items-center gap-2 text-sm font-semibold text-[#087F5B] group-hover:underline" style={{ fontFamily: "Inter" }}>
                  <Download size={16} /> Download Free
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BlogsPage() {
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Blog</p>
            <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Financial Insights Blog</h1>
            <p className="text-white/70" style={{ fontFamily: "Inter" }}>Expert commentary, tax updates, and compliance guidance from our advisory team.</p>
          </div>
        </div>
      </section>
      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Featured */}
          <div className="mb-12 bg-white/5 rounded-3xl overflow-hidden border border-white/10 hover:shadow-xl transition-all grid md:grid-cols-2">
            <img src="https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=600&h=400&fit=crop&auto=format" alt="Budget 2025 analysis" className="w-full h-full object-cover" />
            <div className="p-8 flex flex-col justify-center">
              <span className="text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>Featured Article</span>
              <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Budget 2025: Everything Your Business Needs to Know</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-6" style={{ fontFamily: "Inter" }}>A comprehensive breakdown of every financial measure in Union Budget 2025 that directly impacts Indian businesses.</p>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B]" style={{ fontFamily: "Inter" }}>Read Full Article <ArrowRight size={14} /></button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIGHTS.map((article, i) => (
              <div key={i} className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="h-48 bg-[#EEF1F5] overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format`} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B" }}>{article.tag}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2 leading-tight" style={{ fontFamily: "Manrope" }}>{article.title}</h3>
                  <p className="text-sm text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                    <span>{article.date}</span>
                    <span>{article.readTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CareersPage({ setPage }: { setPage: (p: Page) => void }) {
  const [openApp, setOpenApp] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', experience: '', resumeName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = (i: number) => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.email) newErrors.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid";
    if (!formData.phone) newErrors.phone = "Required";
    if (!formData.experience) newErrors.experience = "Required";
    if (!formData.resumeName) newErrors.resume = "Resume is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSuccess(false);
      return;
    }
    setErrors({});
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setOpenApp(null);
      setFormData({ name: '', email: '', phone: '', experience: '', resumeName: '' });
    }, 3000);
  };
  const benefits = [
    { icon: Award, title: "ICAI CPE Credits", desc: "Structured learning programs that count toward your CPE requirements." },
    { icon: TrendingUp, title: "Fast-Track Growth", desc: "Clear career paths with annual reviews and performance-based promotions." },
    { icon: Users, title: "Expert Mentorship", desc: "Work alongside senior partners with 15-20 years of diverse experience." },
    { icon: Globe, title: "Client Diversity", desc: "Exposure to 15+ industries and 1,500+ client businesses from day one." },
  ];

  return (
    <div className="pt-16">
      <section className="py-20" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Careers</p>
            <h1 className="text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>
              Build Your Career at<br />
              <span style={{ color: "#087F5B" }}>Finovara</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8" style={{ fontFamily: "Inter" }}>
              Join a team of 65+ professionals who are reshaping how India does financial advisory. We invest in people who combine technical excellence with a client-first mindset.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              View Open Positions <ChevronDown size={16} />
            </button>
          </div>
          <div>
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=450&fit=crop&auto=format" alt="Finovara team collaboration" className="rounded-3xl shadow-2xl w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="py-16" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-white mb-8" style={{ fontFamily: "Manrope" }}>Why Join Us</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#EAF4F0" }}>
                  <Icon size={22} style={{ color: "#087F5B" }} />
                </div>
                <h4 className="font-bold text-white mb-2" style={{ fontFamily: "Manrope" }}>{title}</h4>
                <p className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-white mb-8" style={{ fontFamily: "Manrope" }}>Open Positions</h2>
          <div className="space-y-4">
            {OPEN_POSITIONS.map((pos, i) => (
              <div key={i} className="bg-[#102A43] rounded-2xl p-6 border border-white/10 hover:border-[#087F5B]/20 hover:shadow-md transition-all">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: "Manrope" }}>{pos.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                        <Briefcase size={14} style={{ color: "#087F5B" }} /> {pos.dept}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                        <MapPin size={14} style={{ color: "#087F5B" }} /> {pos.location}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#EAF4F0", color: "#087F5B", fontFamily: "Inter" }}>{pos.type}</span>
                    </div>
                  </div>
                  <button onClick={() => setOpenApp(openApp === i ? null : i)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    Apply Now
                  </button>
                </div>
                {openApp === i && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    {success ? (
                      <div className="bg-[#EAF4F0] text-[#087F5B] p-4 rounded-xl text-sm font-medium text-center">
                        Application submitted successfully!
                      </div>
                    ) : (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <input value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} placeholder="Full Name" className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                          </div>
                          <div>
                            <input value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setErrors({...errors, email: ''}); }} placeholder="Email Address" className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                          </div>
                          <div>
                            <input value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }} placeholder="Phone Number" className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                          </div>
                          <div>
                            <input value={formData.experience} onChange={e => { setFormData({...formData, experience: e.target.value}); setErrors({...errors, experience: ''}); }} placeholder="Years of Experience" className={`w-full px-4 py-3 rounded-xl border ${errors.experience ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                            {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
                          </div>
                          <label className={`md:col-span-2 px-4 py-3 rounded-xl border ${errors.resume ? 'border-red-500' : 'border-white/10'} bg-white/5 border-dashed text-center cursor-pointer hover:border-[#087F5B] transition-colors block`}>
                            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setFormData({...formData, resumeName: e.target.files[0].name});
                                setErrors({...errors, resume: ''});
                              }
                            }} />
                            <FileText size={20} className="mx-auto mb-1" style={{ color: formData.resumeName ? "#087F5B" : "#52606D" }} />
                            <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                              {formData.resumeName ? formData.resumeName : "Upload Resume (PDF, max 5MB)"}
                            </span>
                          </label>
                          {errors.resume && <p className="text-red-500 text-xs mt-1 md:col-span-2 text-center">{errors.resume}</p>}
                        </div>
                        <button onClick={() => handleSubmit(i)} className="mt-4 px-6 py-3 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                          Submit Application
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactPage({ setPage }: { setPage: (p: Page) => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.email) newErrors.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid";
    if (!formData.phone) newErrors.phone = "Required";
    if (!formData.message) newErrors.message = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSuccess(false);
      return;
    }
    setErrors({});
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setFormData({ name: '', email: '', phone: '', service: '', message: '' });
    }, 3000);
  };
  return (
    <div className="pt-16">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Get in Touch</p>
          <h1 className="text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope" }}>Contact Finovara</h1>
          <p className="text-white/70 text-lg" style={{ fontFamily: "Inter" }}>We're here to help. Reach out through any channel most convenient for you.</p>
        </div>
      </section>

      <section className="py-20" style={{ background: "#102A43" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {[
              { icon: Phone, label: "Call Us", value: "+91 22 6789 0123", sub: "Mon–Sat, 9:00 AM – 7:00 PM" },
              { icon: Mail, label: "Email Us", value: "hello@finovara.in", sub: "Response within 2 business hours" },
              { icon: MessageCircle, label: "WhatsApp", value: "+91 98765 43210", sub: "Quick queries, Mon–Sat" },
              { icon: MapPin, label: "Head Office", value: "Level 12, One BKC, Mumbai 400051", sub: "" },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="bg-white/5 rounded-2xl p-5 border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EAF4F0" }}>
                  <Icon size={18} style={{ color: "#087F5B" }} />
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] mb-0.5" style={{ fontFamily: "Inter" }}>{label}</div>
                  <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{value}</div>
                  {sub && <div className="text-xs text-[#94A3B8] mt-0.5" style={{ fontFamily: "Inter" }}>{sub}</div>}
                </div>
              </div>
            ))}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="text-xs text-[#94A3B8] mb-3" style={{ fontFamily: "Inter" }}>Business Hours</div>
              {[
                { day: "Monday – Friday", hrs: "9:00 AM – 7:00 PM" },
                { day: "Saturday", hrs: "10:00 AM – 3:00 PM" },
                { day: "Sunday", hrs: "Closed" },
              ].map(({ day, hrs }) => (
                <div key={day} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                  <span className="text-sm font-medium text-white" style={{ fontFamily: "Inter" }}>{day}</span>
                  <span className="text-sm text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{hrs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
            <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "Manrope" }}>Send Us a Message</h2>
            {success ? (
              <div className="bg-[#EAF4F0] text-[#087F5B] p-4 rounded-xl text-sm font-medium mb-6">
                Thank you! Your message has been sent successfully.
              </div>
            ) : null}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Full Name</label>
                <input value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} placeholder="Rahul Sharma" className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]`} style={{ fontFamily: "Inter" }} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Email Address</label>
                <input value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setErrors({...errors, email: ''}); }} placeholder="rahul@company.com" className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]`} style={{ fontFamily: "Inter" }} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Phone Number</label>
                <input value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }} placeholder="+91 98765 43210" className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]`} style={{ fontFamily: "Inter" }} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Service Required</label>
                <select value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 text-[#94A3B8]" style={{ fontFamily: "Inter" }}>
                  <option value="">Select a service</option>
                  {SERVICES.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Message</label>
              <textarea value={formData.message} onChange={e => { setFormData({...formData, message: e.target.value}); setErrors({...errors, message: ''}); }} rows={5} placeholder="Please describe your requirements..." className={`w-full px-4 py-3 rounded-xl border ${errors.message ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] resize-none`} style={{ fontFamily: "Inter" }} />
              {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
            </div>
            <div className="flex flex-wrap gap-4">
              <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                <Send size={16} /> Send Message
              </button>
              <button onClick={() => setPage("book")} className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm hover:bg-[#087F5B] hover:text-white transition-all" style={{ fontFamily: "Inter" }}>
                <Calendar size={16} /> Book Consultation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <div className="h-64 bg-[#EEF1F5] flex items-center justify-center">
        <div className="text-center">
          <MapPin size={32} style={{ color: "#087F5B" }} className="mx-auto mb-2" />
          <p className="text-[#94A3B8] font-medium" style={{ fontFamily: "Inter" }}>Interactive Map — Finovara Head Office, BKC Mumbai</p>
        </div>
      </div>
    </div>
  );
}

function BookPage() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.email) newErrors.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.phone) newErrors.phone = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep(4);
  };

  const times = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#102A43" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
            <Calendar size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: "Manrope" }}>Book a Consultation</h1>
          <p className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Free 30-minute session with a senior Finovara advisor</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: s <= step ? "#087F5B" : "#E2E8F0" }} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: "Manrope" }}>What can we help you with?</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SERVICES.map(({ icon: Icon, title }) => (
                <button key={title} onClick={() => setSelectedService(title)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all text-sm font-medium ${selectedService === title ? "border-[#087F5B] bg-[#EAF4F0]" : "border-white/10 hover:border-[#087F5B]/30 bg-[#102A43]"}`}
                  style={{ fontFamily: "Inter", color: selectedService === title ? "#087F5B" : "#102A43" }}>
                  <Icon size={16} style={{ color: selectedService === title ? "#087F5B" : "#52606D", flexShrink: 0 }} />
                  {title}
                </button>
              ))}
            </div>
            <button disabled={!selectedService} onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: "Manrope" }}>Choose Date & Time</h2>
            <div className="mb-6">
              <label className="text-xs font-semibold text-[#94A3B8] mb-2 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Preferred Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30"
                style={{ fontFamily: "Inter", color: "white" }} />
            </div>
            <div className="mb-8">
              <label className="text-xs font-semibold text-[#94A3B8] mb-2 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Available Slots</label>
              <div className="grid grid-cols-4 gap-2">
                {times.map(time => (
                  <button key={time} onClick={() => setSelectedTime(time)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${selectedTime === time ? "border-[#087F5B] bg-[#EAF4F0] text-[#087F5B]" : "border-white/10 text-[#94A3B8] hover:border-[#087F5B]/30 bg-[#102A43]"}`}
                    style={{ fontFamily: "Inter" }}>
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border-2 border-white/10 text-[#94A3B8] font-semibold text-sm" style={{ fontFamily: "Inter" }}>← Back</button>
              <button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: "Manrope" }}>Your Details</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Full Name</label>
                <input value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} placeholder="Rahul Sharma" className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Email Address</label>
                <input value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setErrors({...errors, email: ''}); }} placeholder="rahul@company.com" className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Phone Number</label>
                <input value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }} placeholder="+91 98765 43210" className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-white/10'} bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30`} style={{ fontFamily: "Inter" }} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Company / Organisation</label>
                <input value={formData.company} onChange={e => { setFormData({...formData, company: e.target.value}); setErrors({...errors, company: ''}); }} placeholder="Sharma Enterprises Pvt Ltd" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30" style={{ fontFamily: "Inter" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Additional Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="Any specific questions or context for the advisor..." className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#102A43] text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 resize-none" style={{ fontFamily: "Inter" }} />
              </div>
            </div>
            {/* Summary */}
            <div className="rounded-2xl p-4 mb-6" style={{ background: "#EAF4F0" }}>
              <div className="text-xs font-semibold text-[#087F5B] mb-2 uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Booking Summary</div>
              {[
                { k: "Service", v: selectedService },
                { k: "Date", v: selectedDate || "—" },
                { k: "Time", v: selectedTime || "—" },
                { k: "Duration", v: "30 minutes (Free)" },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{k}</span>
                  <span className="font-semibold text-white" style={{ fontFamily: "Manrope" }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl border-2 border-white/10 text-[#94A3B8] font-semibold text-sm" style={{ fontFamily: "Inter" }}>← Back</button>
              <button onClick={handleConfirm} className="flex-1 py-4 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div className="bg-white/5 rounded-3xl p-10 border border-white/10 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#EAF4F0" }}>
              <CheckCircle size={32} style={{ color: "#087F5B" }} />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-3" style={{ fontFamily: "Manrope" }}>Consultation Booked!</h2>
            <p className="text-[#94A3B8] mb-4" style={{ fontFamily: "Inter" }}>
              A confirmation has been sent to your email. Your advisor will reach out 24 hours before the session.
            </p>
            <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: "#EAF4F0" }}>
              {[
                { k: "Service", v: selectedService },
                { k: "Date & Time", v: `${selectedDate} at ${selectedTime}` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{k}</span>
                  <span className="font-semibold text-white" style={{ fontFamily: "Manrope" }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border-2 border-[#087F5B] text-[#087F5B] font-semibold text-sm" style={{ fontFamily: "Inter" }}>
              Book Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginPage({ setPage }: { setPage: (p: Page) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <div className="pt-16 min-h-screen grid lg:grid-cols-2">
      {/* Left */}
      <div className="flex flex-col justify-center px-8 py-16 lg:px-16" style={{ background: "#102A43" }}>
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
            </div>
            <div>
              <span className="font-bold text-lg" style={{ fontFamily: "Manrope", color: "white" }}>Finovara</span>
              <span className="block text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Chartered Accountants LLP</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "Manrope" }}>Login Page</h1>
          <p className="text-[#94A3B8] mb-8" style={{ fontFamily: "Inter" }}>Access your documents, compliance calendar, and service status.</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Email Address</label>
              <input type="text" value={email} onChange={e => { setEmail(e.target.value); setErrors({...errors, email: ''}); }}
                placeholder="your@email.com"
                className={`w-full px-4 py-3.5 rounded-xl border ${errors.email ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]`}
                style={{ fontFamily: "Inter" }} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wide" style={{ fontFamily: "Inter" }}>Password</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErrors({...errors, password: ''}); }}
                placeholder="Enter your password"
                className={`w-full px-4 py-3.5 rounded-xl border ${errors.password ? 'border-red-500' : 'border-white/10'} bg-white/5 text-sm outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]`}
                style={{ fontFamily: "Inter" }} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer" style={{ fontFamily: "Inter" }}>
              <input type="checkbox" className="rounded" />
              Remember me
            </label>
            <button className="text-sm font-semibold text-[#087F5B] hover:underline" style={{ fontFamily: "Inter" }}>Forgot Password?</button>
          </div>

          <button 
            disabled={!email || !password}
            onClick={() => {
              const newErrors: Record<string, string> = {};
              if (!email) newErrors.email = "Email is required";
              if (!password) newErrors.password = "Password is required";
              if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
              }
              setErrors({});

              const prefix = email.split('@')[0].toLowerCase();
              const staffRoles = ['superadmin', 'partner', 'ca', 'audit', 'tax', 'gst', 'accountant', 'payroll', 'rm', 'accountsadmin', 'content'];
              
              let role = "Client";
              if (prefix === "superadmin") role = "Super Admin";
              else if (prefix === "partner") role = "Managing Partner";
              else if (prefix === "ca") role = "Chartered Accountant";
              else if (prefix === "audit") role = "Audit Manager";
              else if (prefix === "tax") role = "Tax Manager";
              else if (prefix === "gst") role = "GST Consultant";
              else if (prefix === "accountant") role = "Partner Accountant";
              else if (prefix === "payroll") role = "Payroll Executive";
              else if (prefix === "rm") role = "Relationship Manager";
              else if (prefix === "accountsadmin") role = "Accounts Admin";
              else if (prefix === "content") role = "Content Manager";

              if (typeof (window as any).setUserRole === "function") {
                (window as any).setUserRole(role);
              }

              if (staffRoles.includes(prefix)) {
                setPage("admin");
              } else {
                setPage("dashboard");
              }
            }} 
            className={`w-full py-4 rounded-xl text-white font-semibold text-base mb-4 transition-all ${(!email || !password) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
            Sign In
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>or</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <button 
            disabled={!email}
            onClick={() => setPage("dashboard")} 
            className={`w-full py-4 rounded-xl border-2 border-white/10 text-white font-semibold text-sm transition-all ${!email ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#EEF1F5]'}`} 
            style={{ fontFamily: "Inter" }}>
            Sign in with OTP
          </button>

          <p className="text-center text-sm text-[#94A3B8] mt-6" style={{ fontFamily: "Inter" }}>
            New client?{" "}
            <button onClick={() => setPage("contact")} className="font-semibold text-[#087F5B] hover:underline">Request Portal Access</button>
          </p>
        </div>
      </div>

      {/* Right — Security showcase */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-16" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border border-white/10 bg-white/5">
            <Shield size={14} style={{ color: "#087F5B" }} />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest" style={{ fontFamily: "Inter" }}>Bank-Grade Security</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3" style={{ fontFamily: "Manrope" }}>
            Your Data,<br />
            <span style={{ color: "#087F5B" }}>Fully Protected</span>
          </h2>
          <p className="text-white/60 leading-relaxed mb-8 text-sm" style={{ fontFamily: "Inter" }}>
            Every interaction is secured with enterprise-grade protection. Your financial data is encrypted, monitored, and access-controlled at every level.
          </p>
          <div className="space-y-3">
            {[
              { icon: Shield,       label: "Two-Factor Authentication",   desc: "OTP + authenticator app for every login" },
              { icon: Lock,         label: "Secure File Links",            desc: "Time-limited, signed URLs for every document" },
              { icon: Users,        label: "Role-Based Access",            desc: "Granular permissions per user and team" },
              { icon: FileText,     label: "Audit Logs",                   desc: "Full activity trail for every action taken" },
              { icon: Clock,        label: "File-Version History",         desc: "Restore any previous version of uploaded files" },
              { icon: AlertCircle,  label: "Session Timeout",              desc: "Auto-logout after configurable inactivity period" },
              { icon: Globe,        label: "Device-Login Tracking",        desc: "Alerts and logs for new device sign-ins" },
              { icon: Star,         label: "Encrypted Sensitive Data",     desc: "AES-256 encryption at rest and in transit" },
              { icon: CheckCircle,  label: "Password-Reset Protection",    desc: "MFA-verified resets with anomaly detection" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(8,127,91,0.2)" }}>
                  <Icon size={15} style={{ color: "#087F5B" }} />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs mb-0.5" style={{ fontFamily: "Manrope" }}>{label}</div>
                  <div className="text-xs text-white/40" style={{ fontFamily: "Inter" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const [activeTab, setActiveTab] = useState("Active Services");

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
          {[{t:"Share Form 16",d:"Due 25 Jul",u:"High"},{t:"Provide Bank Statement – Q1",d:"Due 28 Jul",u:"Medium"},{t:"Approve Draft P&L Statement",d:"Due 30 Jul",u:"High"},{t:"Sign GST Return Authorisation",d:"Due 31 Jul",u:"Low"}].map(({t,d,u}) => (
            <div key={t} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: u==="High"?"#FFF0F0":u==="Medium"?"#FFF4E0":"#EAF4F0" }}><AlertCircle size={16} style={{ color: u==="High"?"#e53e3e":u==="Medium"?"#C8A45D":"#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{t}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</div></div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: u==="High"?"#FFF0F0":u==="Medium"?"#FFF4E0":"#EAF4F0", color: u==="High"?"#e53e3e":u==="Medium"?"#C8A45D":"#087F5B" }}>{u}</span>
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
          {[{n:"Form 16 – FY 2024-25.pdf",sz:"1.2 MB",d:"18 Jul 2025"},{n:"Bank Statement Q1.xlsx",sz:"340 KB",d:"15 Jul 2025"},{n:"Investment Proofs.zip",sz:"4.5 MB",d:"10 Jul 2025"},{n:"PAN Card.pdf",sz:"200 KB",d:"05 Jul 2025"}].map(({n,sz,d}) => (
            <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><FileText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{sz} · {d}</div></div>
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
            </div>
          ))}
        </div>
      );
      case "Missing Documents": return (
        <div className="space-y-4">
          {[{n:"Form 26AS – FY 2024-25",r:"Income Tax Filing"},{n:"GST Registration Certificate",r:"GST Advisory"},{n:"Salary Slips – Apr to Jun 2025",r:"Payroll Processing"},{n:"Balance Sheet FY 2024",r:"Audit & Assurance"}].map(({n,r}) => (
            <div key={n} className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: "#FFF8F8", borderColor: "rgba(229,62,62,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF0F0" }}><AlertTriangle size={16} style={{ color: "#e53e3e" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Required for: {r}</div></div>
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#e53e3e", color: "white" }}><UploadCloud size={12} /> Upload</button>
            </div>
          ))}
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
            <button className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>Schedule a Call</button>
          </div>
        </div>
      );
      case "Open Queries": return (
        <div className="space-y-4">
          {[{q:"What is the ITR due date for FY 2024-25?",status:"Answered",a:"The due date for ITR filing for FY 2024-25 is 31st July 2025 for individuals."},{q:"Is my GST registration still active?",status:"Answered",a:"Yes, your GST registration is active. Next return due: 20th July 2025."},{q:"Can I claim HRA deduction without actual rent receipts?",status:"Pending",a:""}].map(({q,status,a}) => (
            <div key={q} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{q}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: status==="Answered"?"#EAF4F0":"#FFF4E0", color: status==="Answered"?"#087F5B":"#C8A45D" }}>{status}</span>
              </div>
              {a && <p className="text-xs text-[#94A3B8] leading-relaxed" style={{ fontFamily: "Inter" }}>{a}</p>}
            </div>
          ))}
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
              <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#087F5B" }}><Download size={13} /> Download</button>
            </div>
          ))}
        </div>
      );
      case "Invoices": return (
        <div className="space-y-4">
          {[{n:"INV-2025-0041",s:"GST Return Filing",amt:"₹4,500",d:"15 Jul 2025",st:"Paid"},{n:"INV-2025-0040",s:"Income Tax Advisory",amt:"₹8,000",d:"05 Jul 2025",st:"Paid"},{n:"INV-2025-0039",s:"Payroll Processing",amt:"₹6,000",d:"30 Jun 2025",st:"Overdue"},{n:"INV-2025-0038",s:"Virtual CFO – Q1",amt:"₹25,000",d:"15 Jun 2025",st:"Paid"}].map(({n,s,amt,d,st}) => (
            <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EAF4F0" }}><ReceiptText size={16} style={{ color: "#087F5B" }} /></div>
                <div><div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{n} · {s}</div><div className="text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>{d}</div></div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-sm" style={{ fontFamily: "Manrope" }}>{amt}</div>
                <span className="text-xs font-bold" style={{ color: st==="Paid"?"#087F5B":"#e53e3e" }}>{st}</span>
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
              <div className="font-bold text-[#087F5B] text-sm" style={{ fontFamily: "Manrope" }}>{amt}</div>
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
          { label: "PAN Documents",             icon: FileText, count: 2,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Aadhaar / Identity Docs",   icon: Shield,   count: 3,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "GST Records",               icon: FileCheck,count: 8,  color: "#C8A45D", bg: "#FFF4E0" },
          { label: "Financial Statements",      icon: BarChart2,count: 5,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Bank Statements",           icon: DollarSign,count: 12, color: "white", bg: "#EEF1F5" },
          { label: "Payroll Data",              icon: Users,    count: 6,  color: "#087F5B", bg: "#EAF4F0" },
          { label: "Agreements",                icon: FileText, count: 4,  color: "#C8A45D", bg: "#FFF4E0" },
          { label: "Audit Evidence",            icon: Search,   count: 9,  color: "white", bg: "#EEF1F5" },
          { label: "Tax Notices",               icon: AlertCircle, count: 3, color: "#e53e3e", bg: "#FFF0F0" },
          { label: "Filing Acknowledgements",   icon: CheckCircle, count: 7, color: "#087F5B", bg: "#EAF4F0" },
        ];
        const [openVaultCategory, setOpenVaultCategory] = useState<string | null>(null);
        const sampleFiles: Record<string, string[]> = {
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
        };
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
                  <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" }}>
                    <UploadCloud size={12} /> Upload New
                  </button>
                </div>
                <div className="space-y-2">
                  {(sampleFiles[openVaultCategory] || []).map(file => (
                    <div key={file} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-[#087F5B]/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={15} style={{ color: "#087F5B" }} />
                        <span className="text-sm font-medium text-white" style={{ fontFamily: "Inter" }}>{file}</span>
                      </div>
                      <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#087F5B" }}>
                        <Download size={13} /> Download
                      </button>
                    </div>
                  ))}
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

          <div className="mt-6 p-5 rounded-2xl border" style={{ background: "#102A43", borderColor: "rgba(0,0,0,0.05)" }}>
            <div className="font-bold text-white text-sm mb-2" style={{ fontFamily: "Manrope" }}>Recent Security Activity</div>
            {[
              { event: "Login from Chrome \u2013 Windows \u2013 Mumbai", time: "Today, 8:04 PM", ok: true },
              { event: "Document downloaded: Form 16 FY 2024-25.pdf", time: "Today, 7:50 PM", ok: true },
              { event: "Password changed successfully", time: "15 Jul 2025, 10:30 AM", ok: true },
              { event: "Login attempt from new device \u2013 OTP verified", time: "12 Jul 2025, 4:15 PM", ok: true },
            ].map(({ event, time, ok }) => (
              <div key={event} className="flex items-center gap-3 py-2.5 border-t border-white/10">
                <CheckCircle size={13} style={{ color: "#087F5B", flexShrink: 0 }} />
                <span className="text-sm text-white flex-1" style={{ fontFamily: "Inter" }}>{event}</span>
                <span className="text-xs text-[#94A3B8] flex-shrink-0" style={{ fontFamily: "Inter" }}>{time}</span>
              </div>
            ))}
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#102A43" }}>
      {/* Dashboard Header */}
      <div className="border-b bg-white/5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
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
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #087F5B)" }}>RM</div>
            <button onClick={() => setPage("login")} className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#e53e3e] transition-colors" style={{ fontFamily: "Inter" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Compliance Score */}
            <div className="p-5 border-b" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Compliance Score</div>
              <div className="text-4xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>98%</div>
              <div className="text-xs text-white/50 mt-1" style={{ fontFamily: "Inter" }}>Excellent standing</div>
            </div>
            <nav className="p-2">
              {tabs.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => setActiveTab(label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${
                    activeTab === label ? "text-white" : "text-[#94A3B8] hover:bg-[#102A43] hover:text-white"
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
        <div className="lg:hidden w-full mb-4 flex overflow-x-auto gap-2 pb-1">
          {tabs.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                activeTab === label ? "text-white" : "bg-white/5 text-[#94A3B8] border border-white/10"
              }`}
              style={activeTab === label ? { background: "linear-gradient(135deg, #087F5B, #065a40)", fontFamily: "Inter" } : { fontFamily: "Inter" }}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubscribe = () => {
    setError("");
    setSuccess(false);
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Invalid email format");
      return;
    }
    setSuccess(true);
    setEmail("");
    setTimeout(() => setSuccess(false), 3000);
  };
  return (
    <footer style={{ background: "#102A43" }}>
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #087F5B, #065a40)" }}>
                <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>F</span>
              </div>
              <div>
                <span className="font-bold text-lg text-white" style={{ fontFamily: "Manrope" }}>Finovara</span>
                <span className="block text-xs" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>Chartered Accountants LLP</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>
              Clarity in Finance. Confidence in Growth. Trusted financial expertise for every stage of your business journey.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Linkedin, url: "https://linkedin.com/company/finovara" },
                { Icon: Twitter, url: "https://twitter.com/finovara" },
                { Icon: Instagram, url: "https://instagram.com/finovara" },
                { Icon: Youtube, url: "https://youtube.com/finovara" },
                { Icon: Facebook, url: "https://facebook.com/finovara" }
              ].map(({ Icon, url }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Icon size={15} style={{ color: "rgba(255,255,255,0.5)" }} />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Services</div>
            <div className="space-y-2">
              {["Income Tax", "GST Services", "Audit & Assurance", "Virtual CFO", "Payroll", "Company Incorporation"].map(s => (
                <button key={s} onClick={() => setPage("services")} className="block text-sm hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Company</div>
            <div className="space-y-2">
              {[
                { label: "About Us", page: "about" as Page },
                { label: "Industries", page: "industries" as Page },
                { label: "Insights", page: "insights" as Page },
                { label: "Careers", page: "careers" as Page },
                { label: "Contact", page: "contact" as Page },
              ].map(({ label, page }) => (
                <button key={label} onClick={() => setPage(page)} className="block text-sm hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Contact</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Phone size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>+91 22 6789 0123</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>hello@finovara.in</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} style={{ color: "#087F5B", marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>One BKC, Mumbai 400051</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-white text-sm mb-4 uppercase tracking-widest" style={{ fontFamily: "Manrope" }}>Newsletter</div>
            <p className="text-xs mb-4" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.5)" }}>
              Tax updates, compliance alerts, and financial insights — delivered monthly.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="Your email"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} text-white placeholder:text-white/30 outline-none focus:border-[#087F5B]`}
                  style={{ fontFamily: "Inter" }} />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                {success && <p className="text-green-400 text-xs mt-1">Subscribed successfully!</p>}
              </div>
              <button onClick={handleSubscribe} className="p-2.5 rounded-xl flex-shrink-0 self-start" style={{ background: "#087F5B" }}>
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>
            © 2025 Finovara Chartered Accountants LLP. All rights reserved. ICAI Firm Reg. No. 123456W.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Use", "Cookie Policy", "Disclaimer"].map(link => (
              <button key={link} className="text-xs hover:text-white transition-colors" style={{ fontFamily: "Inter", color: "rgba(255,255,255,0.4)" }}>{link}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function AdminDashboardPage({ setPage, userRole }: { setPage: (p: Page) => void, userRole: string }) {
  const [activeTab, setActiveTab] = useState("Dashboard");

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
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Edit Permissions</button>
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
          {[
            { task: "GSTR-3B Jun 2025 – TechCorp India",     date: "Mon 21 Jul", staff: "Kavya R." },
            { task: "GSTR-3B Jun 2025 – Sharma & Co",        date: "Mon 21 Jul", staff: "Kavya R." },
            { task: "TDS Return Q1 – ABC Mfg",               date: "Tue 22 Jul", staff: "Rahul S." },
            { task: "Payroll June – Green Pharma",           date: "Wed 23 Jul", staff: "Anita M." },
            { task: "Director KYC – Sunrise Retail",         date: "Thu 24 Jul", staff: "Amit P." },
            { task: "Advance Tax Installment – Rajesh Mehta",date: "Fri 25 Jul", staff: "Rahul S." },
          ].map(({ task, date, staff }) => (
            <div key={task} className="flex items-center gap-4 p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="text-center flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: "#EAF4F0" }}>
                <div className="text-xs font-bold text-[#087F5B]">{date.split(" ")[0]}</div>
                <div className="text-sm font-extrabold text-white">{date.split(" ").slice(1).join(" ")}</div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{task}</div>
                <div className="text-xs text-[#94A3B8]">Assigned: {staff}</div>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Mark Done</button>
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
          {[
            { doc: "Form 16 – Rajesh Mehta",             client: "Rajesh Mehta",   uploaded: "Today",    reviewer: "Rahul S." },
            { doc: "Balance Sheet FY24 – ABC Mfg",       client: "ABC Mfg Ltd",    uploaded: "Yesterday",reviewer: "CA Divya Rao" },
            { doc: "GST Registration – Sharma & Co",     client: "Sharma & Co",    uploaded: "2 days ago",reviewer: "Kavya R." },
            { doc: "Aadhaar – New Director, Green Pharma",client:"Green Pharma",   uploaded: "3 days ago",reviewer: "Amit P." },
            { doc: "Investment Proof – Rajesh Mehta",    client: "Rajesh Mehta",   uploaded: "3 days ago",reviewer: "Rahul S." },
          ].map(({ doc, client, uploaded, reviewer }) => (
            <div key={doc} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF4E0" }}><Folder size={16} style={{ color: "#C8A45D" }} /></div>
                <div>
                  <div className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope" }}>{doc}</div>
                  <div className="text-xs text-[#94A3B8]">{client} · {uploaded} · Reviewer: {reviewer}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "#087F5B" }}>Approve</button>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#FFF0F0", color: "#e53e3e" }}>Reject</button>
              </div>
            </div>
          ))}
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
                <button className="text-xs font-semibold mt-1 px-2 py-1 rounded-lg" style={{ background: "#EAF4F0", color: "#087F5B" }}>Send Reminder</button>
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
            <div className="flex gap-2">{["All (1,542)","Active (1,410)","Inactive (132)"].map(t => <button key={t} className="px-3 py-1.5 rounded-xl bg-[#102A43] border border-white/10 text-xs font-semibold text-white">{t}</button>)}</div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Users size={13} /> Add Client</button>
          </div>
          <div className="space-y-3">
            {[{n:"TechCorp India Pvt Ltd",ca:"CA Priya Nair",pan:"AABCT1234A",gstin:"27AABCT1234A1Z5",svc:5,status:"Active"},{n:"ABC Manufacturing Ltd",ca:"CA Suresh Kumar",pan:"AABCA5678B",gstin:"27AABCA5678B1Z2",svc:7,status:"Active"},{n:"Sharma & Co LLP",ca:"CA Divya Rao",pan:"AAGFS9012C",gstin:"06AAGFS9012C1Z8",svc:2,status:"Active"},{n:"Green Pharma Pvt Ltd",ca:"CA Priya Nair",pan:"AACCP3456D",gstin:"27AACCP3456D1Z4",svc:6,status:"Active"},{n:"Sunrise Retail Ltd",ca:"CA Arjun Mehta",pan:"AADCS7890E",gstin:"07AADCS7890E1Z1",svc:4,status:"Inactive"}].map(({n,ca,pan,gstin,svc,status}) => (
              <div key={n} className="p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n[0]}</div>
                    <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]">CA: {ca} · {svc} services</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#FFF0F0",color:status==="Active"?"#087F5B":"#e53e3e" }}>{status}</span>
                    <button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                    <button className="text-xs px-2 py-1 rounded-lg" style={{ background:"#FFF0F0",color:"#e53e3e" }}>Delete</button>
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
            <div className="text-sm text-[#94A3B8]">12 staff members across 4 roles</div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><UserCheck size={13} /> Add Employee</button>
          </div>
          <div className="space-y-3">
            {[{n:"CA Priya Nair",role:"Partner",dept:"GST & Indirect Tax",clients:142,tasks:8,email:"priya@finovara.in"},{n:"CA Suresh Kumar",role:"Partner",dept:"Direct Tax",clients:118,tasks:6,email:"suresh@finovara.in"},{n:"Rahul Sharma",role:"Senior Manager",dept:"Audit",clients:45,tasks:18,email:"rahul@finovara.in"},{n:"Kavya Reddy",role:"Staff",dept:"GST",clients:62,tasks:22,email:"kavya@finovara.in"},{n:"Amit Patel",role:"Staff",dept:"Compliance",clients:71,tasks:27,email:"amit@finovara.in"},{n:"Sneha Kumar",role:"Staff",dept:"Payroll",clients:28,tasks:12,email:"sneha@finovara.in"}].map(({n,role,dept,clients,tasks,email}) => (
              <div key={n} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background:"linear-gradient(135deg,#102A43,#087F5B)" }}>{n.split(" ").map((w:string)=>w[0]).join("")}</div>
                  <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{n}</div><div className="text-xs text-[#94A3B8]">{role} · {dept} · {email}</div><div className="text-xs text-[#94A3B8]">{clients} clients · {tasks} tasks</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>Active</span>
                  <button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Service Management": return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-[#94A3B8]">12 active services configured</div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Add Service</button>
          </div>
          <div className="space-y-3">
            {[{svc:"Income Tax Filing",cat:"Direct Tax",price:"₹2,000–₹15,000",clients:892,active:true},{svc:"GST Return Filing",cat:"Indirect Tax",price:"₹1,500–₹8,000",clients:743,active:true},{svc:"Accounting & Bookkeeping",cat:"Accounting",price:"₹5,000–₹25,000",clients:521,active:true},{svc:"Payroll Management",cat:"HR & Payroll",price:"₹3,000–₹20,000",clients:389,active:true},{svc:"Audit & Assurance",cat:"Audit",price:"₹15,000–₹1,00,000",clients:267,active:true},{svc:"Virtual CFO",cat:"Advisory",price:"₹25,000–₹75,000",clients:98,active:true},{svc:"Startup Advisory",cat:"Advisory",price:"₹10,000–₹50,000",clients:54,active:true},{svc:"Financial Due Diligence",cat:"Audit",price:"₹50,000+",clients:22,active:false}].map(({svc,cat,price,clients,active}) => (
              <div key={svc} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
                <div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{svc}</div><div className="text-xs text-[#94A3B8]">{cat} · {price} · {clients} clients</div></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:active?"#EAF4F0":"#102A43",color:active?"#087F5B":"#52606D" }}>{active?"Active":"Inactive"}</span>
                  <button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button>
                  <button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Pricing</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "Task Assignment": return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#94A3B8]">68 open tasks across 5 staff members</div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ClipboardList size={13} /> Assign Task</button>
          </div>
          {[{task:"File GSTR-3B – TechCorp India",client:"TechCorp India",assignee:"Kavya R.",due:"20 Jul",priority:"High",status:"In Progress"},{task:"Prepare P&L – ABC Mfg FY25",client:"ABC Mfg Ltd",assignee:"Rahul S.",due:"25 Jul",priority:"High",status:"Pending"},{task:"Payroll June – Green Pharma",client:"Green Pharma",assignee:"Anita M.",due:"23 Jul",priority:"Medium",status:"In Progress"},{task:"Director KYC – Sunrise Retail",client:"Sunrise Retail",assignee:"Amit P.",due:"24 Jul",priority:"Medium",status:"Pending"},{task:"File ITR – Rajesh Mehta",client:"Rajesh Mehta",assignee:"Rahul S.",due:"31 Jul",priority:"High",status:"Not Started"}].map(({task,client,assignee,due,priority,status}) => (
            <div key={task} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex-1"><div className="font-bold text-white text-sm mb-1" style={{ fontFamily:"Manrope" }}>{task}</div><div className="flex gap-3 text-xs text-[#94A3B8]"><span>Client: {client}</span><span>Assignee: {assignee}</span><span>Due: {due}</span></div></div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:priority==="High"?"#FFF0F0":priority==="Medium"?"#FFF4E0":"#EAF4F0",color:priority==="High"?"#e53e3e":priority==="Medium"?"#C8A45D":"#087F5B" }}>{priority}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="In Progress"?"#EAF4F0":status==="Pending"?"#FFF4E0":"#EEF1F5",color:status==="In Progress"?"#087F5B":status==="Pending"?"#C8A45D":"#52606D" }}>{status}</span>
                <button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Reassign</button>
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
          <div className="space-y-3">{[{cat:"PAN Documents",count:"3,084 files",size:"2.1 GB",lastUp:"Today"},{cat:"GST Records",count:"4,231 files",size:"8.4 GB",lastUp:"Today"},{cat:"Financial Statements",count:"2,156 files",size:"12.3 GB",lastUp:"Yesterday"},{cat:"Bank Statements",count:"6,842 files",size:"18.7 GB",lastUp:"Today"},{cat:"Audit Evidence",count:"892 files",size:"4.2 GB",lastUp:"2 days ago"},{cat:"Filing Acknowledgements",count:"1,879 files",size:"980 MB",lastUp:"Today"}].map(({cat,count,size,lastUp}) => (<div key={cat} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"#EAF4F0" }}><Folder size={16} style={{ color:"#087F5B" }} /></div><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{cat}</div><div className="text-xs text-[#94A3B8]">{count} · {size} · Updated: {lastUp}</div></div></div><div className="flex gap-2"><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Browse</button><button className="text-xs px-2 py-1 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Upload</button></div></div>))}</div>
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
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><ReceiptText size={13} /> Create Invoice</button>
          </div>
          <div className="space-y-3">{[{inv:"INV-2025-0041",client:"TechCorp India",svc:"GST Return Filing",amt:"₹4,500",date:"15 Jul",status:"Paid"},{inv:"INV-2025-0040",client:"Rajesh Mehta",svc:"ITR Filing",amt:"₹8,000",date:"05 Jul",status:"Paid"},{inv:"INV-2025-0039",client:"Sunrise Retail",svc:"Payroll Processing",amt:"₹6,000",date:"30 Jun",status:"Overdue"},{inv:"INV-2025-0038",client:"ABC Mfg",svc:"Virtual CFO Q1",amt:"₹25,000",date:"15 Jun",status:"Overdue"},{inv:"INV-2025-0037",client:"Green Pharma",svc:"Audit FY24-25",amt:"₹75,000",date:"01 Jun",status:"Paid"}].map(({inv,client,svc,amt,date,status}) => (<div key={inv} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{inv} · {client}</div><div className="text-xs text-[#94A3B8]">{svc} · {date}</div></div><div className="flex items-center gap-3"><div className="font-bold text-white" style={{ fontFamily:"Manrope" }}>{amt}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Paid"?"#EAF4F0":"#FFF0F0",color:status==="Paid"?"#087F5B":"#e53e3e" }}>{status}</span><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">View</button></div></div>))}</div>
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
          <div className="flex items-center justify-between mb-2"><div className="text-sm text-[#94A3B8]">24 unread notifications</div><button className="text-xs font-semibold" style={{ color:"#087F5B" }}>Mark all read</button></div>
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
              <div className="flex gap-2"><button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Download size={12} /> Download</button><button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EEF1F5",color: "white" }}>Schedule</button></div>
            </div>
          ))}
        </div>
      );
      case "Blog Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#94A3B8]">18 published · 4 drafts · 2 scheduled</div><button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><BookOpen size={13} /> New Post</button></div>
          <div className="space-y-3">{[{title:"Budget 2025: Key Changes for SMEs",cat:"Tax",author:"CA Arjun Mehta",date:"18 Jul 2025",status:"Published",views:"1,240"},{title:"GST Annual Return FY24: Complete Guide",cat:"GST",author:"CA Priya Nair",date:"15 Jul 2025",status:"Published",views:"2,108"},{title:"How to Choose the Right ITR Form",cat:"Income Tax",author:"Rahul S.",date:"—",status:"Draft",views:"—"},{title:"ESOP Taxation for Startup Employees",cat:"Startup",author:"CA Suresh Kumar",date:"25 Jul 2025",status:"Scheduled",views:"—"},{title:"Director KYC: Step-by-Step Process",cat:"Corporate",author:"Amit P.",date:"10 Jul 2025",status:"Published",views:"876"}].map(({title,cat,author,date,status,views}) => (<div key={title} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{title}</div><div className="text-xs text-[#94A3B8]">{cat} · {author} · {date} {views!=="—"?`· ${views} views`:""}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Published"?"#EAF4F0":status==="Scheduled"?"#FFF4E0":"#EEF1F5",color:status==="Published"?"#087F5B":status==="Scheduled"?"#C8A45D":"#52606D" }}>{status}</span><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button></div></div>))}</div>
        </div>
      );
      case "Careers Management": return (
        <div>
          <div className="flex items-center justify-between mb-5"><div className="text-sm text-[#94A3B8]">5 open positions · 48 total applications</div><button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Briefcase size={13} /> Post Job</button></div>
          <div className="space-y-3">{[{role:"Senior CA – Audit & Assurance",type:"Full-time",loc:"Mumbai",apps:14,status:"Active"},{role:"GST Consultant",type:"Full-time",loc:"Mumbai / Remote",apps:22,status:"Active"},{role:"Payroll Executive",type:"Full-time",loc:"Mumbai",apps:8,status:"Active"},{role:"Article Assistant (CA)",type:"Internship",loc:"Mumbai",apps:31,status:"Active"},{role:"Virtual CFO – Part Time",type:"Part-time",loc:"Remote",apps:5,status:"Closed"}].map(({role,type,loc,apps,status}) => (<div key={role} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{role}</div><div className="text-xs text-[#94A3B8]">{type} · {loc} · {apps} applications</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Active"?"#EAF4F0":"#102A43",color:status==="Active"?"#087F5B":"#52606D" }}>{status}</span><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">View Apps</button><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Edit</button></div></div>))}</div>
        </div>
      );
      case "Website CMS": return (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{section:"Homepage",items:"Hero, Services Overview, Stats, Testimonials",lastUpdated:"Today",status:"Live"},{section:"Services Pages",items:"10 service pages with pricing & features",lastUpdated:"18 Jul",status:"Live"},{section:"Industries Page",items:"16 industry cards with service details",lastUpdated:"19 Jul",status:"Live"},{section:"About Us",items:"Team, Milestones, Values, Certifications",lastUpdated:"15 Jul",status:"Live"},{section:"Testimonials",items:"12 client testimonials with ratings",lastUpdated:"12 Jul",status:"Live"},{section:"FAQs",items:"24 categorized FAQs",lastUpdated:"10 Jul",status:"Live"},{section:"Contact Page",items:"Form, Map, Office Hours",lastUpdated:"08 Jul",status:"Live"},{section:"Announcement Banner",items:"Rotating announcement ticker",lastUpdated:"Today",status:"Live"}].map(({section,items,lastUpdated,status}) => (
            <div key={section} className="p-5 bg-[#102A43] rounded-2xl border border-white/10">
              <div className="flex items-start justify-between mb-2"><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{section}</div><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:"#EAF4F0",color:"#087F5B" }}>{status}</span></div>
              <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">{items}</p>
              <div className="flex items-center justify-between"><span className="text-xs text-[#94A3B8]">Updated: {lastUpdated}</span><button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background:"#EAF4F0",color:"#087F5B" }}>Edit Section</button></div>
            </div>
          ))}
        </div>
      );
      case "Lead Management": return (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-3">{[{l:"Total Leads",v:"84"},{l:"This Month",v:"22"},{l:"Converted",v:"14"}].map(({l,v}) => <div key={l} className="px-4 py-2 bg-[#102A43] rounded-xl border border-white/10 text-center"><div className="font-extrabold text-sm text-[#087F5B]" style={{ fontFamily:"Manrope" }}>{v}</div><div className="text-xs text-[#94A3B8]">{l}</div></div>)}</div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background:"linear-gradient(135deg,#087F5B,#065a40)" }}><Target size={13} /> Add Lead</button>
          </div>
          <div className="space-y-3">{[{name:"Vikram Industries",contact:"Vikram Shah",source:"Website",service:"GST Advisory",status:"Hot",followUp:"Today"},{name:"Priyanka Consultants",contact:"Priyanka R.",source:"Referral",service:"Income Tax",status:"Warm",followUp:"22 Jul"},{name:"Metro Constructions",contact:"Anil Sharma",source:"LinkedIn",service:"Audit",status:"Hot",followUp:"Today"},{name:"FinStart Pvt Ltd",contact:"CEO",source:"Google Ads",service:"Startup Advisory",status:"Cold",followUp:"28 Jul"},{name:"Sunita Kapoor",contact:"Sunita K.",source:"Walk-in",service:"ITR Filing",status:"Converted",followUp:"Done"}].map(({name,contact,source,service,status,followUp}) => (<div key={name} className="flex items-center justify-between p-4 bg-[#102A43] rounded-2xl border border-white/10"><div><div className="font-bold text-white text-sm" style={{ fontFamily:"Manrope" }}>{name} · {contact}</div><div className="text-xs text-[#94A3B8]">{source} · {service} · Follow-up: {followUp}</div></div><div className="flex items-center gap-2"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:status==="Hot"?"#FFF0F0":status==="Warm"?"#FFF4E0":status==="Converted"?"#EAF4F0":"#EEF1F5",color:status==="Hot"?"#e53e3e":status==="Warm"?"#C8A45D":status==="Converted"?"#087F5B":"#52606D" }}>{status}</span><button className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">Update</button></div></div>))}</div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#102A43" }}>
      {/* Admin Header */}
      <div className="border-b bg-white/5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Manrope" }}>A</span>
            </div>
            <div>
              <span className="font-bold text-white" style={{ fontFamily: "Manrope" }}>Finovara Admin</span>
              <span className="block text-xs text-[#94A3B8]" style={{ fontFamily: "Inter" }}>Practice Management Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #102A43, #e53e3e)" }}>AM</div>
            <button onClick={() => setPage("login")} className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#e53e3e] transition-colors" style={{ fontFamily: "Inter" }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden sticky top-6">
              {(() => {
                const r = roles.find(x => x.name === userRole);
                return r ? (
                  <div className="p-5 border-b" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)", borderColor: "rgba(255,255,255,0.1)" }}>
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
              <nav className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {tabs.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => setActiveTab(label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all mb-0.5 ${activeTab === label ? "text-white" : "text-[#94A3B8] hover:bg-[#102A43] hover:text-white"}`}
                    style={activeTab === label ? { background: "linear-gradient(135deg, #102A43, #0d3355)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
                    <Icon size={15} />{label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile Tabs */}
          <div className="lg:hidden w-full mb-4 flex overflow-x-auto gap-2 pb-1">
            {tabs.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => setActiveTab(label)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${activeTab === label ? "text-white" : "bg-white/5 text-[#94A3B8] border border-white/10"}`}
                style={activeTab === label ? { background: "linear-gradient(135deg, #102A43, #0d3355)", fontFamily: "Inter" } : { fontFamily: "Inter" }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "Manrope" }}>{activeTab}</h2>
                {userRole && (() => { const r = roles.find(x => x.name === userRole); return r ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: r.bg, color: r.color }}>
                    <r.icon size={11} /> {r.name}
                  </span>
                ) : null; })()}
              </div>
              {renderContent()}
            </div>
          </main>
        </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() => {
    const path = window.location.pathname.replace('/', '');
    return (path === "book-consultation" ? "book" : path as Page) || "home";
  });
  const [userRole, setUserRole] = useState<string>("Client");

  // Make setUserRole accessible to LoginPage
  useEffect(() => {
    (window as any).setUserRole = setUserRole;
  }, []);

  const navigateTo = useCallback((p: Page) => {
    setPage(p);
    const path = p === "book" ? "/book-consultation" : p === "home" ? "/home" : `/${p}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      setPage((path as Page) || "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showAnnouncement = page === "home";
  const showFooter = page !== "login" && page !== "dashboard" && page !== "admin";

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap');

        * { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(16,42,67,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(8,127,91,0.4); }
      `}</style>

      <div className="fixed w-full top-0 z-[60] flex flex-col">
        {showAnnouncement && <AnnouncementBar setPage={navigateTo} />}
        <Navbar currentPage={page} setPage={navigateTo} />
      </div>
      <div style={{ paddingTop: page === "home" ? 0 : 72 }}>
        <main>
          {page === "home" && <HomePage setPage={navigateTo} />}
          {page === "about" && <AboutPage setPage={navigateTo} />}
          {page === "services" && <ServicesPage setPage={navigateTo} />}
          {page === "industries" && <IndustriesPage setPage={navigateTo} />}
          {page === "insights" && <InsightsPage />}
          {page === "resources" && <ResourcesPage />}
          {page === "blogs" && <BlogsPage />}
          {page === "faqs" && <FaqsPage />}
          {page === "testimonials" && <TestimonialsPage />}
          {page === "careers" && <CareersPage setPage={navigateTo} />}
          {page === "contact" && <ContactPage setPage={navigateTo} />}
          {page === "book" && <BookPage />}
          {page === "login" && <LoginPage setPage={navigateTo} />}
          {page === "dashboard" && <DashboardPage setPage={navigateTo} />}
          {page === "admin" && <AdminDashboardPage setPage={navigateTo} userRole={userRole} />}
        </main>
        {showFooter && <Footer setPage={navigateTo} />}
      </div>
    </div>
  );
}

