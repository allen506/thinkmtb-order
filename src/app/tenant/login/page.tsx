'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TenantLoginPage() {
  const [mode, setMode] = useState<'password' | 'passwordless'>('passwordless'); // Default to passwordless
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [teamPasswordRequired, setTeamPasswordRequired] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const magicToken = searchParams.get('magic');

  // Get tenant info from headers in layout
  useEffect(() => {
    const name = document.documentElement.dataset.tenantName || 'Team Portal';
    setTenantName(name);
  }, []);

  // Auto-verify magic token if present
  useEffect(() => {
    if (magicToken) {
      verifyMagicToken(magicToken);
    }
  }, [magicToken]);

  const verifyMagicToken = async (token: string) => {
    setVerifyingToken(true);
    try {
      const response = await fetch('/api/tenant/auth/verify-passwordless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login link is invalid or expired');
        setVerifyingToken(false);
        return;
      }

      // Success - redirect to user dashboard
      setSuccess('✅ Logged in successfully!');
      setTimeout(() => {
        router.push('/user');
      }, 1000);
    } catch (err) {
      setError('Failed to verify login link');
      setVerifyingToken(false);
    }
  };

  const handlePasswordlessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tenant/auth/passwordless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send login link');
        setLoading(false);
        return;
      }

      setSuccess('✅ Check your email for a login link!');
      setEmail('');

      // In development, show the token for testing
      if (data.token) {
        setSuccess(`✅ Login link ready!\n\n🔐 Token: ${data.token}\n\nOr check your email`);
      }
    } catch (error) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8 text-center">
          <div className="animate-spin inline-block h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Login Link...</h2>
          <p className="text-gray-600">Please wait while we process your request</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{tenantName}</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => { setMode('passwordless'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              mode === 'passwordless'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔗 Magic Link
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              mode === 'password'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔑 Password
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm whitespace-pre-wrap font-mono">{success}</p>
          </div>
        )}

        {/* Passwordless Login */}
        {mode === 'passwordless' && (
          <form onSubmit={handlePasswordlessSubmit} className="space-y-4">
            <div>
              <label htmlFor="passwordless-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="passwordless-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">We'll send you a secure login link</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? 'Sending link...' : '📧 Send Login Link'}
            </button>
          </form>
        )}

        {/* Password Login */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="password-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password-field" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password-field"
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
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="../register" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
