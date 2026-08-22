"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6 py-20" style={{ background: "#f5f5f7" }}>
      <div className="text-center mb-14">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Team Apparel</p>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-3">ThinkMTB</h1>
        <p className="text-lg text-gray-400 font-light">Team Order System</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg">
        <Link
          href="/user"
          className="group bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5 text-2xl group-hover:bg-blue-100 transition-colors">
            👤
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Team Members</h2>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">Place orders, view your items, and check pricing</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
            Enter portal →
          </span>
        </Link>

        <Link
          href="/admin/login"
          className="group bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5 text-2xl group-hover:bg-amber-100 transition-colors">
            ⚙️
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Admins</h2>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">Manage orders, products, designs, and team totals</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 group-hover:gap-2 transition-all">
            Enter portal →
          </span>
        </Link>
      </div>

      <p className="mt-12 text-xs text-gray-400">Built by 506r</p>
    </div>
  );
}
