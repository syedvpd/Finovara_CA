"use client";

import { Page } from "../../types";

interface NotFoundPageProps {
  setPage: (page: Page) => void;
}

export default function NotFound({ setPage }: NotFoundPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6">
      <div className="text-8xl font-black text-white mb-4">404</div>
      <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <button
        onClick={() => setPage("home")}
        className="bg-[#C8A45D] text-[#102A43] px-8 py-3 rounded-lg font-semibold hover:bg-[#06674b] transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}