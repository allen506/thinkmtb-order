'use client';

import { Suspense, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function TeamUnlockContent() {
  const params = useParams();
  const teamSlug = params.teamname as string;
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tenant/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSlug,
          teamPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid team password');
        return;
      }

      setSuccess('✓ Team verified! Redirecting...');
      // Store verification in session/cookie and redirect
      document.cookie = `team_verified_${teamSlug}=true; path=/; secure; samesite=lax`;
      
      setTimeout(() => {
        router.push(`/custom/${teamSlug}/login`);
      }, 500);
    } catch (err) {
      setError('Failed to verify team password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f5f5f7' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-200">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {teamSlug.charAt(0).toUpperCase() + teamSlug.slice(1)}
            </h1>
            <p className="text-gray-600">Team Portal Access</p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Password
              </label>
              <input
                type="password"
                value={teamPassword}
                onChange={(e) => {
                  setTeamPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter team password"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 placeholder-gray-400"
              />
              <p className="text-sm text-gray-500 mt-2">
                Ask your team coordinator for the team password
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Verifying...' : 'Unlock Portal'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Password Reset Link */}
          <div className="text-center">
            <Link
              href={`/custom/${teamSlug}/forgot-password`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Forgot team password?
            </Link>
          </div>

          {/* Back Button */}
          <div className="text-center mt-8">
            <Link
              href="/custom"
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              ← Back to portal entry
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-xs">
          <p>Secure portal for {teamSlug} team members</p>
        </div>
      </div>
    </div>
  );
}

export default function TeamUnlock() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <TeamUnlockContent />
    </Suspense>
  );
}
