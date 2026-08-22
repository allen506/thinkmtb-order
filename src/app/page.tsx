"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-start px-3 sm:px-6 pt-8 sm:pt-16 pb-20" style={{ background: "#f5f5f7" }}>
      <div className="text-center mb-16 sm:mb-16 w-full">
        <p className="text-sm sm:text-base md:text-lg font-semibold tracking-widest text-gray-400 uppercase mb-6 sm:mb-6 md:mb-8">Team Apparel</p>
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold text-gray-900 tracking-tight mb-5 sm:mb-6 md:mb-8 leading-tight">ThinkMTB</h1>
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-400 font-light">Team Order System</p>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-xl px-0 sm:max-w-2xl md:max-w-4xl md:grid md:grid-cols-2">
        <Link
          href="/user"
          className="group bg-white rounded-3xl p-8 sm:p-10 md:p-12 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 active:translate-y-0"
        >
          <div className="w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-8 sm:mb-8 md:mb-10 text-5xl sm:text-6xl md:text-8xl group-hover:bg-blue-100 transition-colors">
            👤
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4 sm:mb-5 md:mb-6 leading-snug">Team Members</h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-8 sm:mb-8 md:mb-10 leading-relaxed">Place orders, view your items, and check pricing</p>
          <span className="inline-flex items-center gap-2 text-xl sm:text-2xl md:text-2xl font-medium text-blue-600 group-hover:gap-3 transition-all">
            Enter portal →
          </span>
        </Link>

        <Link
          href="/admin/login"
          className="group bg-white rounded-3xl p-8 sm:p-10 md:p-12 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 active:translate-y-0"
        >
          <div className="w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-8 sm:mb-8 md:mb-10 text-5xl sm:text-6xl md:text-8xl group-hover:bg-amber-100 transition-colors">
            ⚙️
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4 sm:mb-5 md:mb-6 leading-snug">Admins</h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-8 sm:mb-8 md:mb-10 leading-relaxed">Manage orders, products, designs, and team totals</p>
          <span className="inline-flex items-center gap-2 text-xl sm:text-2xl md:text-2xl font-medium text-amber-600 group-hover:gap-3 transition-all">
            Enter portal →
          </span>
        </Link>
      </div>

      <p className="mt-16 sm:mt-16 md:mt-20 text-sm sm:text-base md:text-lg text-gray-400">Built by 506r</p>
    </div>
  );
}
