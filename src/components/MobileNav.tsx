"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg z-50">
          <div className="px-4 py-3 space-y-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-700 transition-colors"
            >
              Place Order
            </Link>
            <Link
              href="/my-orders"
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-700 transition-colors"
            >
              My Orders
            </Link>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium bg-amber-600 hover:bg-amber-700 transition-colors text-center"
            >
              TeamTotals
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
