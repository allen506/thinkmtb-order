'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomLanding() {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }
    
    const slug = teamName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/custom/${slug}/unlock`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#f5f5f7" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            CMS Sports Wear
          </h1>
          <h2 className="text-3xl md:text-4xl font-light text-gray-600 mb-6">
            Custom Designs
          </h2>
          <p className="text-xl text-gray-500 font-light">
            Create and customize your team apparel
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Design Tools
            </h3>
            <p className="text-gray-600">
              Easy-to-use design customization for all your apparel needs
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Team Management
            </h3>
            <p className="text-gray-600">
              Invite team members and manage orders together
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Easy Ordering
            </h3>
            <p className="text-gray-600">
              Simple checkout process with secure payment options
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fast Fulfillment
            </h3>
            <p className="text-gray-600">
              Quick production and shipping for your team
            </p>
          </div>
        </div>

        {/* Join Form */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-200">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Join Your Team
          </h3>
          
          <form onSubmit={handleJoinTeam} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError('');
                }}
                placeholder="Enter your team name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter your team name to access your portal
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Access Team Portal →
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            Secure and password-protected access for team members
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} CMS Sports Wear. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
