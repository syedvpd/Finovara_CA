// Page route type
export type Page =
  | "home" | "about" | "services" | "industries" | "insights"
  | "resources" | "faqs" | "testimonials" | "careers"
  | "contact" | "book" | "login" | "dashboard" | "admin"
  | "partner" | "ca" | "audit" | "tax" | "gst" | "accountant" | "payroll" | "rm" | "accountsadmin" | "content"
  | "privacy" | "terms";

// Navigation prop shared across all pages
export interface NavProps {
  setPage: (page: Page) => void;
}