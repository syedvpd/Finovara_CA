import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { Page } from "../../types/index";

export function LegalPage({ page, setPage }: { page: "privacy" | "terms"; setPage: (p: Page) => void }) {
  const isPrivacy = page === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Use";
  const Icon = isPrivacy ? ShieldCheck : FileText;
  const lastUpdated = "July 15, 2025";

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#102A43]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setPage("home")}
          className="flex items-center gap-2 text-[#087F5B] font-semibold text-sm mb-8 hover:underline cursor-pointer"
          style={{ fontFamily: "Inter" }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#EAF4F0]">
              <Icon size={24} style={{ color: "#087F5B" }} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900" style={{ fontFamily: "Manrope" }}>
                {title}
              </h1>
              <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: "Inter" }}>
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-slate-700 prose-headings:font-bold prose-headings:text-slate-900 leading-relaxed" style={{ fontFamily: "Inter" }}>
            {isPrivacy ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>1. Information We Collect</h3>
                <p className="mb-6">
                  Finovara Chartered Accountants LLP ("Finovara", "we", "us", or "our") collects personal and financial information when you use our website, client portal, or engage our services. This may include your name, contact details, PAN, GSTIN, financial records, and other relevant documents required for compliance and advisory services.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>2. How We Use Your Information</h3>
                <p className="mb-6">
                  We use your data strictly to provide professional services, process your tax returns, perform audits, and ensure regulatory compliance. We do not sell or share your data with third parties for marketing purposes.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>3. Data Security</h3>
                <p className="mb-6">
                  We employ bank-grade, 256-bit encryption on our client portal to protect your sensitive financial data. Access is strictly role-based, ensuring that only authorized personnel can view your documents.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>4. Your Rights</h3>
                <p className="mb-6">
                  You have the right to access, correct, or request the deletion of your personal data at any time. For any privacy-related inquiries, please contact our data protection officer at privacy@finovara.in.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>1. Acceptance of Terms</h3>
                <p className="mb-6">
                  By accessing the Finovara Chartered Accountants LLP website and client portal, you agree to be bound by these Terms of Use, all applicable laws, and regulations.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>2. Professional Services Disclaimer</h3>
                <p className="mb-6">
                  The content on this website is for informational purposes only and does not constitute professional financial, legal, or tax advice. Engaging Finovara requires a signed letter of engagement outlining the specific scope of services.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>3. User Obligations</h3>
                <p className="mb-6">
                  Users of the Finovara client portal are responsible for maintaining the confidentiality of their login credentials and for all activities that occur under their account. You must provide accurate and complete information for compliance filings.
                </p>
                
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>4. Limitation of Liability</h3>
                <p className="mb-6">
                  Finovara shall not be liable for any indirect, incidental, or consequential damages arising from the use of our digital platforms or reliance on general information provided herein.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
