/**
 * public.ts — unauthenticated website endpoints (/public/*).
 * Marketing pages and public forms consume these.
 */
import { api } from "../lib/api";

export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  published_at: string | null;
  read_time_minutes: number | null;
}

export interface Career {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  is_open: boolean;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  rating: number | null;
}

export interface DownloadItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  service_id?: string;
  website?: string; // honeypot — leave empty
}

export const publicApi = {
  blogs: () => api.get<Blog[]>("/public/blogs"),
  blog: (slug: string) => api.get<Blog>(`/public/blogs/${slug}`),
  careers: () => api.get<Career[]>("/public/careers"),
  testimonials: () => api.get<Testimonial[]>("/public/testimonials"),
  downloads: () => api.get<DownloadItem[]>("/public/downloads"),
  settings: () => api.get<Record<string, unknown>>("/public/settings"),

  /** Contact / enquiry form. Returns the generic confirmation message. */
  submitContact: (payload: ContactPayload) =>
    api.post<{ message: string }>("/public/contact", payload),

  /** Job application with CV upload (multipart). */
  applyForVacancy: (careerId: string, fields: {
    applicant_name: string;
    applicant_email: string;
    applicant_phone: string;
    cover_letter?: string;
    resume: File;
  }) => {
    const form = new FormData();
    form.set("applicant_name", fields.applicant_name);
    form.set("applicant_email", fields.applicant_email);
    form.set("applicant_phone", fields.applicant_phone);
    if (fields.cover_letter) form.set("cover_letter", fields.cover_letter);
    form.set("resume", fields.resume);
    return api.post<{ message: string }>(`/public/careers/${careerId}/apply`, undefined, { form });
  },
};
