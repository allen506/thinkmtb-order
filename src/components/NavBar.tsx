"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "./MobileNav";

export type UserRole = "user" | "admin" | null;

export default function NavBar() {
  const [role, setRole] = useState<UserRole>(null);
  const [mounted, setMounted] = useState(false);

  const checkAuthRole = () => {
    const hasUserAuth = localStorage.getItem("auth-user");
    const hasAdminAuth = localStorage.getItem("auth-admin");
    if (hasAdminAuth) setRole("admin");
    else if (hasUserAuth) setRole("user");
    else setRole(null);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("auth-user");
      sessionStorage.removeItem("auth-admin");
      localStorage.removeItem("auth-user");
      localStorage.removeItem("auth-admin");
    } catch {}
    // Invalidate server-side admin session cookie
    fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    setRole(null);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/";
  };

  useEffect(() => {
    // Initial check
    checkAuthRole();
    setMounted(true);

    // Listen for custom auth-changed event (dispatched by PasswordGate)
    const handleAuthChanged = () => checkAuthRole();
    window.addEventListener("auth-changed", handleAuthChanged);

    // Also check periodically since storage events don't fire on same tab
    const interval = setInterval(checkAuthRole, 1000);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      clearInterval(interval);
    };
  }, []);

  if (!mounted) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">ThinkMTB</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const homeHref = role === "admin" ? "/admin" : role === "user" ? "/user" : "/";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href={homeHref} className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 tracking-tight">ThinkMTB</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {role === "user" && (
              <>
                <Link href="/user" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Dashboard</Link>
              </>
            )}
            {role === "admin" && (
              <>
                <Link href="/products" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Products</Link>
                <Link href="/admin" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Team Totals</Link>
                <Link href="/admin/campaign" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Campaign</Link>
                <Link href="/admin/settings" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Settings</Link>
              </>
            )}
            {!role && (
              <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Login</Link>
            )}
            {role && (
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <MobileNav role={role} />
        </div>
      </div>
    </nav>
  );
}
