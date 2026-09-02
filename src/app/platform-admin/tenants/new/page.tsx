'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateTenantPage() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    admin_email: '',
    admin_password: '',
    admin_full_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.slug || !formData.admin_email || !formData.admin_password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/platform-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create tenant');
        return;
      }

      // Redirect to dashboard
      router.push('/platform-admin/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/platform-admin/dashboard">
            <button className="text-blue-600 hover:text-blue-800 mb-4">← Back to Dashboard</button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Tenant</h1>
          <p className="text-gray-600 mt-1">Add a new client/tenant to the platform</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          {/* Tenant Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={generateSlug}
              placeholder="e.g., ThinkMTB, CMS Sports, Bike Club"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">The name of your client/organization</p>
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug *
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., thinkmtb, cms-sports"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Used in URLs (auto-generated from name). Example: yourdomain.com/tenant/{formData.slug}
            </p>
          </div>

          {/* Admin Email */}
          <div>
            <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email *
            </label>
            <input
              id="admin_email"
              name="admin_email"
              type="email"
              value={formData.admin_email}
              onChange={handleChange}
              placeholder="admin@thinkmtb.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">Email for the tenant admin account</p>
          </div>

          {/* Admin Full Name */}
          <div>
            <label htmlFor="admin_full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Full Name
            </label>
            <input
              id="admin_full_name"
              name="admin_full_name"
              type="text"
              value={formData.admin_full_name}
              onChange={handleChange}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password *
            </label>
            <input
              id="admin_password"
              name="admin_password"
              type="password"
              value={formData.admin_password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Use a strong password (minimum 8 characters recommended)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
            <Link href="/platform-admin/dashboard" className="flex-1">
              <button
                type="button"
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
