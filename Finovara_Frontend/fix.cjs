const fs = require('fs');
const content = fs.readFileSync('src/app/App.tsx', 'utf8');

const newFunc = `export const handleDownloadResource = (title: string) => {
  let htmlContent = "";
  let filename = "";

  if (title === "Firm Profile") {
    htmlContent = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finovara Firm Profile</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #F7F9FC; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px 80px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 52px; margin: 0; font-weight: 800; }
    .header p { font-size: 20px; opacity: 0.8; margin-top: 10px; font-weight: 500; }
    .container { max-width: 900px; margin: -60px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    .hero-img { width: 100%; height: 350px; object-fit: cover; border-radius: 16px; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #F7F9FC; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); transition: transform 0.2s; }
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
</html>\`;
    filename = "Finovara_Firm_Profile.html";
  } else {
    let h2 = "";
    let body = "";
    if (title === "Compliance Checklist") {
      h2 = "Monthly Compliance Checklist FY 2024-25";
      body = \`<p class="lead">Never miss a deadline again. This checklist covers all mandatory filings for Indian companies.</p>
      <div class="grid">
        <div class="card"><h3>GST Returns</h3><p>GSTR-1 by 11th, GSTR-3B by 20th of every month.</p></div>
        <div class="card"><h3>TDS Payments</h3><p>Due by the 7th of the following month.</p></div>
        <div class="card"><h3>PF & ESI</h3><p>Contributions due by the 15th of the following month.</p></div>
        <div class="card"><h3>Advance Tax</h3><p>Installments on 15th of Jun, Sep, Dec, and Mar.</p></div>
      </div>\`;
      filename = "Finovara_Compliance_Checklist.html";
    } else if (title === "Tax Guide 2025") {
      h2 = "Tax Guide & Budget 2025 Highlights";
      body = \`<p class="lead">A comprehensive guide to the new tax regime changes and strategic planning tips.</p>
      <div class="grid">
        <div class="card"><h3>New Tax Regime</h3><p>Standard deduction increased, basic exemption limit revised.</p></div>
        <div class="card"><h3>Corporate Tax</h3><p>Surcharge reduced for manufacturing companies.</p></div>
        <div class="card"><h3>Capital Gains</h3><p>Rationalization of holding periods across asset classes.</p></div>
        <div class="card"><h3>Startup Exemptions</h3><p>Tax holiday extended for DPIIT registered startups by 1 year.</p></div>
      </div>\`;
      filename = "Finovara_Tax_Guide_2025.html";
    } else if (title === "Startup Handbook") {
      h2 = "Startup Incorporation & Compliance Handbook";
      body = \`<p class="lead">A step-by-step guide for founders to incorporate and maintain full compliance.</p>
      <div class="grid">
        <div class="card"><h3>Incorporation</h3><p>Choosing between Private Limited vs LLP.</p></div>
        <div class="card"><h3>Initial Filings</h3><p>Commencement of business (INC-20A) and auditor appointment (ADT-1).</p></div>
        <div class="card"><h3>DPIIT Registration</h3><p>Process and benefits of being a recognized startup.</p></div>
        <div class="card"><h3>Funding Compliance</h3><p>FEMA guidelines and private placement rules under Companies Act.</p></div>
      </div>\`;
      filename = "Finovara_Startup_Handbook.html";
    }

    htmlContent = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>\${title} | Finovara</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #F7F9FC; color: #102A43; }
    .header { background: linear-gradient(135deg, #102A43, #0d3355); padding: 60px 20px; text-align: center; color: white; }
    .header h1 { font-family: 'Manrope', sans-serif; font-size: 42px; margin: 0; font-weight: 800; }
    .container { max-width: 900px; margin: -40px auto 60px; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); position: relative; }
    h2 { font-family: 'Manrope', sans-serif; font-size: 32px; color: #087F5B; border-bottom: 3px solid #EAF4F0; padding-bottom: 12px; margin-top: 0; }
    p.lead { line-height: 1.8; font-size: 18px; color: #52606D; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .card { background: #F7F9FC; padding: 30px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); }
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
    <h2>\${h2}</h2>
    \${body}
    <div class="footer">
      <strong>Finovara Chartered Accountants LLP</strong><br>
      A global standard of financial excellence and integrity.<br><br>
      Contact: contact@finovara.in | +91 98765 43210 | www.finovara.in
    </div>
  </div>
</body>
</html>\`;
  }

  const element = document.createElement("a");
  const file = new Blob([htmlContent], {type: 'text/html'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.startsWith('export const handleDownloadResource = (title: string) => {'));
let endIdx = -1;
if (startIdx !== -1) {
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i] === '};') {
            endIdx = i;
            break;
        }
    }
}
if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, newFunc);
    fs.writeFileSync('src/app/App.tsx', lines.join('\n'));
    console.log('Fixed syntax error!');
} else {
    console.log('Could not find bounds of handleDownloadResource. start:', startIdx, 'end:', endIdx);
}
