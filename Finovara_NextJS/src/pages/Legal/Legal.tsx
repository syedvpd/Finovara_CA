"use client";
import { Reveal } from "@/components/animations/Reveal";

const PRIVACY_SECTIONS = [
  { title: "Information We Collect", body: "We collect information you provide directly — name, email, phone, company details — when you contact us, book a consultation, or register for the client portal. We also collect usage data (pages visited, time on site) via cookies to improve our services." },
  { title: "How We Use Your Information", body: "Your information is used to deliver the services you request, communicate about your engagements, send compliance reminders, and improve our platform. We do not sell or rent your personal data to third parties." },
  { title: "Data Security", body: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure is ISO 27001-compliant. Access to client data is role-based and audit-logged. We conduct regular security assessments." },
  { title: "Data Retention", body: "Client documents are retained for 8 years in line with statutory requirements under the Income Tax Act and Companies Act. You may request deletion of non-statutory personal data at any time by contacting us." },
  { title: "Cookies", body: "We use essential cookies for session management and analytics cookies (with your consent) to understand usage patterns. You can manage cookie preferences through your browser settings." },
  { title: "Your Rights", body: "You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@finovara.in. We will respond within 30 days." },
  { title: "Contact", body: "For privacy-related queries, contact our Data Protection Officer at privacy@finovara.in or write to Finovara Chartered Accountants LLP, Hyderabad, Telangana, India." },
];

const TERMS_SECTIONS = [
  { title: "Acceptance of Terms", body: "By accessing or using Finovara's website, client portal, or services, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately." },
  { title: "Services", body: "Finovara provides professional chartered accountancy, tax, audit, and advisory services. All engagements are governed by a separate Engagement Letter that supersedes these general terms for specific services." },
  { title: "Client Responsibilities", body: "Clients are responsible for providing accurate, complete, and timely information. Finovara's advice is based on information provided; we are not liable for outcomes arising from incomplete or incorrect data." },
  { title: "Confidentiality", body: "We maintain strict confidentiality of all client information in accordance with the ICAI Code of Ethics and applicable law. Client data is never shared with third parties without explicit consent, except as required by law." },
  { title: "Intellectual Property", body: "All content on this website — including text, graphics, logos, and reports — is the property of Finovara Chartered Accountants LLP. Unauthorised reproduction or distribution is prohibited." },
  { title: "Limitation of Liability", body: "Finovara's liability for any claim arising from our services is limited to the fees paid for the specific engagement giving rise to the claim. We are not liable for indirect, consequential, or punitive damages." },
  { title: "Governing Law", body: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana." },
  { title: "Changes to Terms", body: "We may update these terms from time to time. Continued use of our services after changes constitutes acceptance of the revised terms. Material changes will be communicated via email." },
];

function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const updated = "1 January 2025";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div>
      <section className="py-24 text-white" style={{ background: "linear-gradient(135deg, #102A43, #0d3355)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Reveal direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A45D", fontFamily: "Inter" }}>Legal</p>
            <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "Manrope" }}>{title}</h1>
            <p className="text-white/50 text-sm" style={{ fontFamily: "Inter" }}>Last updated: {updated}</p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-8">
            {sections.map(({ title: t, body }, i) => (
              <Reveal key={i} direction="up">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: "Manrope" }}>{t}</h2>
                  <p className="text-gray-600 leading-relaxed" style={{ fontFamily: "Inter" }}>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PrivacyPage() { return <LegalPage type="privacy" />; }
export function TermsPage() { return <LegalPage type="terms" />; }
