"use client";

import Link from "next/link";
import PasswordGate from "@/components/PasswordGate";

export default function AdminLoginPage() {
  return (
    <PasswordGate
      password=""
      storageKey="auth-admin"
      verifyEndpoint="/api/admin/verify-password"
      title="Admin Login"
      checkOrderingStatus={false}
    >
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Admin Portal</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Where would you like to go?</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/admin"
            className="group bg-white rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col"
          >
            <div className="flex-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 text-xl group-hover:bg-amber-100 transition-colors">📊</div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Team Totals</h2>
              <p className="text-sm text-gray-400 leading-relaxed">View orders, breakdowns, and manage the campaign</p>
            </div>
            <div className="mt-5 text-sm font-medium text-amber-600 flex items-center gap-1">Go to Dashboard →</div>
          </Link>

          <Link
            href="/products"
            className="group bg-white rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col"
          >
            <div className="flex-1">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 text-xl group-hover:bg-blue-100 transition-colors">⚙️</div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Products</h2>
              <p className="text-sm text-gray-400 leading-relaxed">Manage designs, products, and pricing</p>
            </div>
            <div className="mt-5 text-sm font-medium text-blue-600 flex items-center gap-1">Go to Management →</div>
          </Link>
        </div>
      </div>
    </PasswordGate>
  );
}
