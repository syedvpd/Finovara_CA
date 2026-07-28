import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { Page } from "../../types/index";

export function LegalPage({ page, setPage }: { page: "privacy" | "terms" | "cookie" | "disclaimer"; setPage: (p: Page) => void }) {
  const isPrivacy = page === "privacy";
  const isCookie = page === "cookie";
  const isDisclaimer = page === "disclaimer";
  const title = isPrivacy ? "Privacy Policy" : isCookie ? "Cookie Policy" : isDisclaimer ? "Disclaimer" : "Terms of Use";
  const Icon = isPrivacy || isCookie ? ShieldCheck : FileText;
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
            {isCookie ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>1. What Are Cookies</h3>
                <p className="mb-6">
                  Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, keep you logged in, and understand how you use our site.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>2. How We Use Cookies</h3>
                <p className="mb-6">
                  We use essential cookies to operate the client portal, analytical cookies to improve our services, and preference cookies to remember your settings. We do not use cookies for advertising purposes.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>3. Managing Cookies</h3>
                <p className="mb-6">
                  You can control or delete cookies through your browser settings at any time. Disabling essential cookies may affect the functionality of the client portal.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>4. Third-Party Cookies</h3>
                <p className="mb-6">
                  We may use trusted third-party services (such as analytics providers) that set their own cookies. These are governed by the respective third-party privacy policies.
                </p>
              </>
            ) : isDisclaimer ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>1. General Disclaimer</h3>
                <p className="mb-6">
                  The information provided on this website is for general informational purposes only. It does not constitute professional financial, legal, or tax advice and should not be relied upon as such.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>2. No Professional Relationship</h3>
                <p className="mb-6">
                  Accessing this website does not create a client-professional relationship between you and Finovara Chartered Accountants LLP. A formal engagement letter is required before any professional services are rendered.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>3. Accuracy of Information</h3>
                <p className="mb-6">
                  While we strive to keep the information up to date and accurate, we make no representations or warranties of any kind about the completeness, accuracy, or reliability of the content on this website.
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4" style={{ fontFamily: "Manrope" }}>4. External Links</h3>
                <p className="mb-6">
                  This website may contain links to external sites. Finovara is not responsible for the content or privacy practices of those sites.
                </p>
              </>
            ) : isPrivacy ? (
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
