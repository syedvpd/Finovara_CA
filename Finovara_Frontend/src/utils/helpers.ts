import { jsPDF } from "jspdf";
import { COMPLIANCE_CALENDAR } from "./constants";

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

const PDF_NAVY = [16, 42, 67] as const;
const PDF_GREEN = [8, 127, 91] as const;
const PDF_GRAY = [82, 96, 109] as const;
const PDF_LIGHT = [234, 244, 240] as const;
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function pdfHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(...PDF_NAVY);
  doc.rect(0, 0, PAGE_W, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Finovara", PAGE_W / 2, 20, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, PAGE_W / 2, 31, { align: "center" });
  doc.setTextColor(...PDF_NAVY);
}

function pdfFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_LIGHT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("Finovara Chartered Accountants LLP  |  contact@finovara.in  |  +91 98765 43210  |  www.finovara.in", PAGE_W / 2, PAGE_H - 9, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_GREEN);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...PDF_GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_W, y + 2);
  return y + 10;
}

function bodyText(doc: jsPDF, text: string, y: number, maxWidth = CONTENT_W): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_GRAY);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5.5;
}

function cardBox(doc: jsPDF, x: number, y: number, w: number, h: number, heading: string, content: string) {
  doc.setFillColor(...PDF_LIGHT);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_NAVY);
  doc.text(heading, x + 5, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_GRAY);
  const lines = doc.splitTextToSize(content, w - 10);
  doc.text(lines, x + 5, y + 15);
}

function statBox(doc: jsPDF, x: number, y: number, w: number, value: string, label: string) {
  doc.setFillColor(...PDF_GREEN);
  doc.roundedRect(x, y, w, 22, 3, 3, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(value, x + w / 2, y + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x + w / 2, y + 17, { align: "center" });
}

export const handleDownloadResource = (title: string) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  if (title === "Firm Profile") {
    pdfHeader(doc, "Chartered Accountants LLP");
    let y = 52;

    // Badges
    const badges = ["ICAI Registered", "ISO 27001 Certified", "Established 2010"];
    const bw = 48, bh = 7, gap = 5;
    const totalBW = badges.length * bw + (badges.length - 1) * gap;
    let bx = (PAGE_W - totalBW) / 2;
    badges.forEach(b => {
      doc.setFillColor(...PDF_LIGHT);
      doc.roundedRect(bx, y, bw, bh, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_GREEN);
      doc.text(b.toUpperCase(), bx + bw / 2, y + 4.8, { align: "center" });
      bx += bw + gap;
    });
    y += 14;

    y = sectionTitle(doc, "About Our Firm", y);
    y = bodyText(doc, "Finovara Chartered Accountants LLP is a premier financial and advisory firm committed to delivering excellence. With over 15 years of experience, we provide a comprehensive suite of services ranging from statutory audits and tax advisory to complex financial structuring and compliance management for enterprises across India.", y);
    y += 8;

    y = sectionTitle(doc, "Core Competencies", y);
    const cards = [
      ["Audit & Assurance", "Robust auditing services ensuring compliance, transparency, and actionable financial insights for private and public companies."],
      ["Tax Advisory", "Strategic tax planning, assessment, and compliance for both direct (Income Tax) and indirect taxation (GST & Customs)."],
      ["Corporate Finance", "Expert guidance on capital structuring, mergers, acquisitions, due diligence, and comprehensive business valuations."],
      ["Virtual CFO", "End-to-end financial management, rigorous budgeting, and strategic forecasting tailored for rapidly growing businesses."],
    ];
    const cw = (CONTENT_W - 6) / 2;
    cards.forEach(([h, p], i) => {
      const cx = MARGIN + (i % 2) * (cw + 6);
      const cy = y + Math.floor(i / 2) * 32;
      cardBox(doc, cx, cy, cw, 28, h, p);
    });
    y += 70;

    y = sectionTitle(doc, "Key Statistics", y);
    const stats = [["15+", "Years Experience"], ["1,500+", "Active Clients"], ["4,000+", "Tax Filings"], ["100%", "Compliance"]];
    const sw = (CONTENT_W - 15) / 4;
    stats.forEach(([v, l], i) => statBox(doc, MARGIN + i * (sw + 5), y, sw, v, l));

    pdfFooter(doc);
    doc.save("Finovara_Firm_Profile.pdf");

  } else if (title === "Compliance Checklist") {
    pdfHeader(doc, "Monthly Compliance Checklist — FY 2024-25");
    let y = 52;

    y = sectionTitle(doc, "Compliance Calendar Overview", y);
    y = bodyText(doc, "Never miss a deadline again. This calendar covers all crucial tax and regulatory filings for the financial year 2024-25. Deadlines are subject to government notifications.", y);
    y += 6;

    COMPLIANCE_CALENDAR.forEach((item, idx) => {
      if (y > PAGE_H - 40) { doc.addPage(); y = 20; }
      const rowH = 18;
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
      doc.setDrawColor(220, 230, 225);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, y, CONTENT_W, rowH);

      // Type badge
      doc.setFillColor(...PDF_LIGHT);
      doc.roundedRect(MARGIN + 2, y + 3, 22, 6, 1.5, 1.5, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_GREEN);
      doc.text(item.type.toUpperCase(), MARGIN + 13, y + 7.2, { align: "center" });

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_NAVY);
      doc.text(item.task, MARGIN + 27, y + 7);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_GRAY);
      const descLines = doc.splitTextToSize(item.desc, CONTENT_W - 60);
      doc.text(descLines, MARGIN + 27, y + 13);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_GREEN);
      doc.text(item.date, PAGE_W - MARGIN - 2, y + 7, { align: "right" });

      y += rowH + 2;
    });

    pdfFooter(doc);
    doc.save("Finovara_Compliance_Checklist.pdf");

  } else if (title === "Tax Guide 2025") {
    pdfHeader(doc, "Tax Guide & Budget 2025 Highlights");
    let y = 52;

    y = sectionTitle(doc, "Overview", y);
    y = bodyText(doc, "A comprehensive guide to the new tax regime changes and strategic planning tips for individuals, businesses, and startups following the Union Budget 2025.", y);
    y += 8;

    const sections: [string, string, string[]][] = [
      ["New Tax Regime", "The Union Budget 2025 introduced significant changes to the new tax regime to make it more attractive:", [
        "Standard deduction increased from ₹50,000 to ₹75,000 for salaried individuals.",
        "Basic exemption limit revised upward, reducing tax burden for middle-income earners.",
        "Rebate under Section 87A enhanced — zero tax for income up to ₹7 lakh.",
        "Simplified slab structure with fewer brackets for easier compliance.",
      ]],
      ["Corporate Tax", "Key changes affecting companies and businesses:", [
        "Surcharge reduced for domestic manufacturing companies to boost Make in India.",
        "Presumptive taxation threshold increased for small businesses and professionals.",
        "Equalisation levy rationalised for digital transactions.",
        "Simplified TDS/TCS provisions to reduce compliance burden.",
      ]],
      ["Capital Gains", "Rationalization of capital gains taxation across asset classes:", [
        "Holding period for long-term capital gains unified at 24 months for most assets.",
        "LTCG tax rate on equity and equity mutual funds remains at 10% above ₹1 lakh.",
        "Indexation benefit removed for property sold after July 23, 2024.",
        "STT increased on futures and options to curb speculative trading.",
      ]],
      ["Startup Exemptions", "Benefits extended for DPIIT-registered startups:", [
        "Tax holiday under Section 80-IAC extended by one additional year.",
        "Angel tax abolished — Section 56(2)(viib) removed entirely.",
        "Carry forward of losses allowed even on change of shareholding for startups.",
        "ESOP taxation deferred until sale of shares or exit, whichever is earlier.",
      ]],
    ];

    sections.forEach(([heading, intro, points]) => {
      if (y > PAGE_H - 60) { doc.addPage(); y = 20; }
      y = sectionTitle(doc, heading, y);
      y = bodyText(doc, intro, y);
      y += 2;
      points.forEach(pt => {
        if (y > PAGE_H - 30) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...PDF_GRAY);
        doc.setFillColor(...PDF_GREEN);
        doc.circle(MARGIN + 2, y - 1.5, 1, "F");
        const lines = doc.splitTextToSize(pt, CONTENT_W - 8);
        doc.text(lines, MARGIN + 6, y);
        y += lines.length * 5 + 2;
      });
      y += 6;
    });

    pdfFooter(doc);
    doc.save("Finovara_Tax_Guide_2025.pdf");

  } else if (title === "Startup Handbook") {
    pdfHeader(doc, "Startup Incorporation & Compliance Handbook");
    let y = 52;

    y = sectionTitle(doc, "Introduction", y);
    y = bodyText(doc, "A step-by-step guide for founders to incorporate their business and maintain full legal and regulatory compliance in India. This handbook covers entity selection, initial filings, government registrations, and ongoing compliance obligations.", y);
    y += 8;

    const chapters: [string, string, string[]][] = [
      ["1. Choosing Your Entity", "Selecting the right business structure is the most critical first decision:", [
        "Private Limited Company — Best for startups seeking VC/angel funding. Offers limited liability, separate legal identity, and easy share transfer.",
        "LLP (Limited Liability Partnership) — Ideal for professional services firms. Lower compliance burden, no dividend distribution tax.",
        "One Person Company (OPC) — Suitable for solo founders. Simpler structure but cannot raise equity funding easily.",
        "Partnership Firm — Simplest structure but partners have unlimited liability. Not recommended for scalable businesses.",
      ]],
      ["2. Incorporation Process", "Steps to incorporate a Private Limited Company:", [
        "Obtain DSC (Digital Signature Certificate) for all proposed directors.",
        "Apply for DIN (Director Identification Number) via SPICe+ form on MCA portal.",
        "Reserve company name using RUN (Reserve Unique Name) service.",
        "File SPICe+ form with MOA, AOA, and supporting documents.",
        "Receive Certificate of Incorporation (COI) with CIN, PAN, and TAN.",
      ]],
      ["3. Initial Post-Incorporation Filings", "Mandatory filings within 180 days of incorporation:", [
        "INC-20A — Declaration of Commencement of Business. Must be filed before any business activity.",
        "ADT-1 — Appointment of first statutory auditor within 30 days of incorporation.",
        "Open a current bank account and deposit the subscribed share capital.",
        "Obtain GST registration if turnover exceeds ₹20 lakh (₹10 lakh for special category states).",
        "Register for Professional Tax (PT) in applicable states.",
      ]],
      ["4. DPIIT Startup Recognition", "Benefits and process for DPIIT recognition:", [
        "Apply on Startup India portal (startupindia.gov.in) with business description and incorporation documents.",
        "Eligibility: Entity not older than 10 years, turnover under ₹100 crore, working on innovation/scalable model.",
        "Benefits: Tax holiday (80-IAC), angel tax exemption, self-certification under 9 labour laws.",
        "Fast-track patent examination at 80% rebate on filing fees.",
      ]],
      ["5. Ongoing Annual Compliance", "Key annual filings for a Private Limited Company:", [
        "AOC-4 — Filing of financial statements within 30 days of AGM.",
        "MGT-7 — Annual Return filing within 60 days of AGM.",
        "DIR-3 KYC — Annual KYC for all directors by September 30.",
        "Income Tax Return — Due by October 31 for companies requiring audit.",
        "GST Annual Return (GSTR-9) — Due by December 31 for the previous FY.",
      ]],
    ];

    chapters.forEach(([heading, intro, points]) => {
      if (y > PAGE_H - 60) { doc.addPage(); y = 20; }
      y = sectionTitle(doc, heading, y);
      y = bodyText(doc, intro, y);
      y += 2;
      points.forEach(pt => {
        if (y > PAGE_H - 30) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...PDF_GRAY);
        doc.setFillColor(...PDF_GREEN);
        doc.circle(MARGIN + 2, y - 1.5, 1, "F");
        const lines = doc.splitTextToSize(pt, CONTENT_W - 8);
        doc.text(lines, MARGIN + 6, y);
        y += lines.length * 5 + 2;
      });
      y += 6;
    });

    pdfFooter(doc);
    doc.save("Finovara_Startup_Handbook.pdf");
  }
};
