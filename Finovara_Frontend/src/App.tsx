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
import { AnimatePresence, motion } from "framer-motion";
import { Page } from "./types/index";
import { useAuth, roleDisplayName } from "./context";
import { AnnouncementBar } from "./components/hero/AnnouncementBar";
import { Navbar } from "./components/navbar/Navbar";
import { HomePage } from "./pages/Home/Home";
import { AboutPage } from "./pages/About/About";
import { ServicesPage } from "./pages/Services/Services";
import { IndustriesPage } from "./pages/Industries/Industries";
import { InsightsPage } from "./pages/Insights/Insights";
import { ResourcesPage } from "./pages/Resources/Resources";
import { FaqsPage } from "./pages/Faqs/Faqs";
import { TestimonialsPage } from "./pages/Testimonials/Testimonials";
import { CareersPage } from "./pages/Careers/Careers";
import { ContactPage } from "./pages/Contact/Contact";
import { BookPage } from "./pages/Book/Book";
import { LoginPage } from "./pages/Login/Login";
import { DashboardPage } from "./pages/Dashboard/Dashboard";
import { AdminDashboardPage } from "./pages/Admin/AdminDashboard";
import { LegalPage } from "./pages/Legal/Legal";
import { Footer } from "./components/footer/Footer";

export default function App() {
  const [page, setPage] = useState<Page>(() => {
    const path = window.location.pathname.replace('/', '');
    return (path === "book-consultation" ? "book" : path as Page) || "home";
  });
  const { session, loading: authLoading } = useAuth();
  const userRole = roleDisplayName(session);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const navigateTo = useCallback((p: Page) => {
    // Stamp current scroll position into the current history entry before leaving
    window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '');
    setPage(p);
    const path = p === "book" ? "/book-consultation" : p === "home" ? "/home" : `/${p}`;
    window.history.pushState({ scrollY: 0 }, '', path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname.replace('/', '');
      const savedScrollY: number = e.state?.scrollY ?? 0;
      // Write scroll target into sessionStorage so the mounting page can read it
      window.sessionStorage.setItem('restoreScrollY', String(savedScrollY));
      setPage((path as Page) || "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showAnnouncement = page === "home";
  const staffRoutes = ["admin", "partner", "ca", "audit", "tax", "gst", "accountant", "payroll", "rm", "accountsadmin", "content"];
  const isProtected = page === "dashboard" || staffRoutes.includes(page);

  // Route guard: protected pages require a session. Once auth has resolved,
  // an unauthenticated hit on a portal route bounces to login.
  useEffect(() => {
    if (!authLoading && isProtected && !session) {
      navigateTo("login");
    }
  }, [authLoading, isProtected, session, navigateTo]);

  const showFooter = page !== "login" && page !== "dashboard" && !staffRoutes.includes(page);
  const showNavbar = page !== "dashboard" && !staffRoutes.includes(page);

  if (isLoading || authLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a1d2e]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", repeat: Infinity, repeatType: "reverse" }}
          className="w-16 h-16 border-4 border-[#087F5B] border-t-[#C8A45D] rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#102A43]" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap');

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(16,42,67,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(8,127,91,0.4); }
      `}</style>

      {showNavbar && (
        <div className="fixed w-full top-0 z-[60] flex flex-col">
          {showAnnouncement && <AnnouncementBar setPage={navigateTo} />}
          <Navbar currentPage={page} setPage={navigateTo} />
        </div>
      )}
      <div style={{ paddingTop: (!showNavbar || page === "home") ? 0 : 72, height: !showNavbar ? '100vh' : 'auto' }}>
        <main style={{ height: !showNavbar ? '100%' : 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ height: !showNavbar ? '100%' : 'auto' }}
          >
            {page === "home" && <HomePage setPage={navigateTo} />}
            {page === "about" && <AboutPage setPage={navigateTo} />}
            {page === "services" && <ServicesPage setPage={navigateTo} />}
            {page === "industries" && <IndustriesPage setPage={navigateTo} />}
            {page === "insights" && <InsightsPage />}
            {page === "resources" && <ResourcesPage />}
            {page === "faqs" && <FaqsPage />}
            {page === "testimonials" && <TestimonialsPage />}
            {page === "careers" && <CareersPage setPage={navigateTo} />}
            {page === "contact" && <ContactPage setPage={navigateTo} />}
            {page === "book" && <BookPage />}
            {page === "login" && <LoginPage setPage={navigateTo} />}
            {page === "dashboard" && <DashboardPage setPage={navigateTo} />}
            {staffRoutes.includes(page) && <AdminDashboardPage setPage={navigateTo} userRole={userRole} />}
            {page === "privacy" && <LegalPage page="privacy" setPage={navigateTo} />}
            {page === "terms" && <LegalPage page="terms" setPage={navigateTo} />}
            {page === "cookie" && <LegalPage page="cookie" setPage={navigateTo} />}
            {page === "disclaimer" && <LegalPage page="disclaimer" setPage={navigateTo} />}
          </motion.div>
        </AnimatePresence>
        </main>
        {showFooter && <Footer setPage={navigateTo} />}
      </div>
    </div>
  );
}
