'use client';

import { useHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * Tenant Portal Landing Page
 * Subdomain: thinkmtb.cmssportswear.us
 * Shows team logo, name, and login/register links
 */
export default function TenantPortal() {
  // Note: In actual implementation, we'd get tenant from headers
  // For now, showing the landing page structure

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo Section */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-white rounded-lg mx-auto flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-gray-800">🏍️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Team Portal</h1>
          <p className="text-gray-300">Welcome to your team's order portal</p>
        </div>

        {/* Login Section */}
        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-4">
          <Link href="./login">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">
              Sign In
            </button>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
            </div>
          </div>

          <Link href="./register">
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg transition">
              Create Account
            </button>
          </Link>
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p>© 2024 CMS Sports Wear</p>
          <p className="mt-2">Need help? Contact your team administrator.</p>
        </div>
      </div>
    </div>
  );
}
