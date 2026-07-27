import {
  FileText, FileCheck, Shield, BarChart2, Building2, Users, TrendingUp,
  Lightbulb, Target, Layers, Cpu, MapPin, Heart, BookOpen, Globe, Star,
  Briefcase, Zap, UserCheck, PieChart, Flag, Bell, Lock, Mail
} from "lucide-react";
import { Page } from "../types/index";

export const NAV_ITEMS = [
  { label: "Home", page: "home" as Page },
  { label: "About", page: "about" as Page },
  { label: "Services", page: "services" as Page },
  { label: "Industries", page: "industries" as Page },
  { label: "Client Portal", page: "login" as Page },
  { label: "Insights", page: "insights" as Page },
  {
    label: "Resources", page: "resources" as Page,
    children: [
      { label: "Blog", page: "blogs" as Page },
      { label: "FAQs", page: "faqs" as Page },
      { label: "Testimonials", page: "testimonials" as Page },
    ]
  },
  { label: "Careers", page: "careers" as Page },
  { label: "Contact", page: "contact" as Page },
  { label: "Login", page: "login" as Page, isButton: true },
];

export const STATS = [
  { value: 65, suffix: "+", label: "Professionals" },
  { value: 1500, suffix: "+", label: "Clients Supported" },
  { value: 4000, suffix: "+", label: "Tax Filings" },
  { value: 750, suffix: "+", label: "GST Registrations and Returns" },
  { value: 500, suffix: "+", label: "Audit Assignments" },
  { value: 300, suffix: "+", label: "Company Incorporation Assignments" },
  { value: 150, suffix: "+", label: "Virtual CFO Engagements" },
  { value: 20, suffix: "+", label: "Industry Segments" },
  { value: 96, suffix: "%", label: "Client Retention" },
  { value: 24, suffix: "-hour", label: "Initial Response Target" },
];

export const SERVICES = [
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

export const INDUSTRIES = [
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

export const FEATURES = [
  { icon: Users, title: "Experienced accounting and taxation team", desc: "" },
  { icon: UserCheck, title: "Dedicated relationship managers", desc: "" },
  { icon: Lock, title: "Secure client document portal", desc: "" },
  { icon: Bell, title: "Compliance due-date reminders", desc: "" },
  { icon: TrendingUp, title: "Real-time service-status tracking", desc: "" },
  { icon: FileCheck, title: "Structured audit workflows", desc: "" },
  { icon: Lightbulb, title: "Startup and SME expertise", desc: "" },
  { icon: BarChart2, title: "Virtual CFO support", desc: "" },
  { icon: FileText, title: "Digital report delivery", desc: "" },
  { icon: Building2, title: "Multi-branch service capability", desc: "" },
  { icon: Shield, title: "Role-based document access", desc: "" },
  { icon: PieChart, title: "Transparent task and invoice management", desc: "" },
  { icon: Mail, title: "Automated email notifications", desc: "" },
  { icon: Layers, title: "Centralized financial dashboard", desc: "" },
];

export const WORKFLOW = [
  { step: "01", title: "Consultation", desc: "Understand your business needs through a free discovery call." },
  { step: "02", title: "Requirement Collection", desc: "Our team gathers all relevant documentation and data requirements." },
  { step: "03", title: "Document Upload", desc: "Securely upload documents through our encrypted client portal." },
  { step: "04", title: "Professional Review", desc: "Qualified CAs review and validate all materials for compliance." },
  { step: "05", title: "Compliance Processing", desc: "Filing, submissions, and regulatory processing handled end-to-end." },
  { step: "06", title: "Report Preparation", desc: "Comprehensive reports prepared with clear financial insights." },
  { step: "07", title: "Client Approval", desc: "Review outputs and provide digital approval before final submission." },
  { step: "08", title: "Final Delivery", desc: "Secure delivery of all documents, certificates, and compliance filings." },
];

export const FEATURED_ASSIGNMENTS = [
  { tag: "M&A Advisory", title: "Cross-Border Acquisition", desc: "Structured the acquisition of a European tech firm for an Indian SaaS unicorn, ensuring tax-efficient fund flows.", metric: "Deal Size: $45M" },
  { tag: "Restructuring", title: "Debt Restructuring for Manufacturing", desc: "Turnaround strategy and debt restructuring for a legacy textile manufacturer facing liquidity crunch.", metric: "Saved ₹25Cr" },
  { tag: "Tax Strategy", title: "FDI Tax Optimization", desc: "Optimized the inbound investment structure for a Japanese auto-component manufacturer setting up in Gujarat.", metric: "Completed in 4 weeks" }
];

export const COMPLIANCE_CALENDAR = [
  { date: "15th Oct", task: "TCS Return Filing", desc: "Quarterly TCS return for the quarter ending Sept.", type: "Income Tax" },
  { date: "20th Oct", task: "GSTR-3B", desc: "Monthly GST return filing for the previous month.", type: "GST" },
  { date: "30th Oct", task: "ROC Filing (AOC-4)", desc: "Annual financial statement filing with MCA.", type: "ROC" },
  { date: "31st Oct", task: "Income Tax Audit", desc: "Due date for filing Tax Audit Report for corporate taxpayers.", type: "Income Tax" }
];

export const TESTIMONIALS = [
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

export const INSIGHTS = [
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

export const FAQS = [
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

export const OPEN_POSITIONS = [
  { title: "Senior Chartered Accountant", dept: "Audit & Assurance", type: "Full-time", location: "Hyderabad" },
  { title: "GST Consultant", dept: "Indirect Tax", type: "Full-time", location: "Hyderabad / Remote" },
  { title: "Payroll Executive", dept: "Payroll", type: "Full-time", location: "Bengaluru" },
  { title: "Article Assistant (CA)", dept: "Articleship", type: "Internship", location: "Hyderabad" },
  { title: "Financial Controller", dept: "Client Services", type: "Full-time", location: "Hyderabad" },
];

export const INDUSTRY_DETAILS: Record<string, { services: string[]; compliance: string[]; color: string }> = {
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