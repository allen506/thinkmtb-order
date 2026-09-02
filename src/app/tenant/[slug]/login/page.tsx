'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function TenantLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [teamPasswordRequired, setTeamPasswordRequired] = useState(false);
  const router = useRouter();

  // Get tenant info from headers in layout
  useEffect(() => {
    const name = document.documentElement.dataset.tenantName || 'Team Portal';
    setTenantName(name);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tenant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          teamPassword: teamPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'team_password_required') {
          setTeamPasswordRequired(true);
          setLoading(false);
          return;
        }
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Success - redirect to user dashboard
      setSuccess('✅ Logged in successfully!');
      setTimeout(() => {
        router.push('/user');
      }, 1000);
    } catch (error) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{tenantName}</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Password Login Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {teamPasswordRequired && (
            <div>
              <label htmlFor="team-password" className="block text-sm font-medium text-gray-700 mb-2">
                Team Password
              </label>
              <input
                id="team-password"
                type="password"
                value={teamPassword}
                onChange={(e) => setTeamPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team password"
              />
              <p className="text-xs text-gray-500 mt-1">Ask your team admin for the team password</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="./register" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TenantLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <TenantLoginContent />
    </Suspense>
  );
}
