"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-start px-3 sm:px-6 pt-6 sm:pt-12 pb-20" style={{ background: "#f5f5f7" }}>
      <div className="text-center mb-16 sm:mb-10 w-full">
        <p className="text-sm sm:text-sm font-semibold tracking-widest text-gray-400 uppercase mb-5 sm:mb-3">Team Apparel</p>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-4 sm:mb-3 leading-tight">ThinkMTB</h1>
        <p className="text-lg sm:text-lg text-gray-400 font-light">Team Order System</p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-xl px-0 sm:max-w-2xl md:grid md:grid-cols-2">
        <Link
          href="/user"
          className="group bg-white rounded-3xl p-7 sm:p-8 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 active:translate-y-0"
        >
          <div className="w-20 sm:w-14 h-20 sm:h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-7 sm:mb-5 text-5xl sm:text-2xl group-hover:bg-blue-100 transition-colors">
            👤
          </div>
          <h2 className="text-xl sm:text-base font-semibold text-gray-900 mb-3 sm:mb-1 leading-snug">Team Members</h2>
          <p className="text-base sm:text-sm text-gray-400 mb-7 sm:mb-5 leading-relaxed">Place orders, view your items, and check pricing</p>
          <span className="inline-flex items-center gap-2 text-lg sm:text-sm font-medium text-blue-600 group-hover:gap-3 transition-all">
            Enter portal →
          </span>
        </Link>

        <Link
          href="/admin/login"
          className="group bg-white rounded-3xl p-7 sm:p-8 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 active:translate-y-0"
        >
          <div className="w-20 sm:w-14 h-20 sm:h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-7 sm:mb-5 text-5xl sm:text-2xl group-hover:bg-amber-100 transition-colors">
            ⚙️
          </div>
          <h2 className="text-xl sm:text-base font-semibold text-gray-900 mb-3 sm:mb-1 leading-snug">Admins</h2>
          <p className="text-base sm:text-sm text-gray-400 mb-7 sm:mb-5 leading-relaxed">Manage orders, products, designs, and team totals</p>
          <span className="inline-flex items-center gap-2 text-lg sm:text-sm font-medium text-amber-600 group-hover:gap-3 transition-all">
            Enter portal →
          </span>
        </Link>
      </div>

      <p className="mt-16 sm:mt-12 text-sm sm:text-xs text-gray-400">Built by 506r</p>
    </div>
  );
}
