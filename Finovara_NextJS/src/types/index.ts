export type Page =
  | "home" | "about" | "services" | "industries" | "insights"
  | "resources" | "blogs" | "faqs" | "testimonials" | "careers"
  | "contact" | "book" | "login" | "dashboard" | "admin"
  | "partner" | "ca" | "audit" | "tax" | "gst" | "accountant" | "payroll" | "rm" | "accountsadmin" | "content"
  | "privacy" | "terms";

export interface NavProps {
  setPage?: (page: Page) => void;
}
