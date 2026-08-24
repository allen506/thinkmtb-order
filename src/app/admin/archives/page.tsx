"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PasswordGate from "@/components/PasswordGate";

interface Archive {
  id: number;
  campaign_name: string;
  campaign_number: number;
  archived_at: string;
  total_orders: number;
  total_items: number;
  total_revenue_usd: number;
  delete_at: string;
  created_at: string;
}

export default function ArchivesPage() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchArchives = useCallback(async () => {
    try {
      const res = await fetch("/api/archived-campaigns");
      const json = await res.json();
      setArchives(json.archives || []);
    } catch (err) {
      console.error("Failed to fetch archives:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const filteredArchives = archives.filter((archive) =>
    archive.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (archive: Archive) => {
    setSelectedArchive(archive);
    setShowDetails(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const daysUntilDelete = (deleteAt: string) => {
    const days = Math.ceil(
      (new Date(deleteAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, days);
  };

  if (loading) {
    return (
      <PasswordGate
        password=""
        storageKey="auth-admin"
        verifyEndpoint="/api/admin/verify-password"
        title="Archived Campaigns"
        checkOrderingStatus={false}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate
      password=""
      storageKey="auth-admin"
      verifyEndpoint="/api/admin/verify-password"
      title="Archived Campaigns"
      checkOrderingStatus={false}
    >
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Archived Campaigns</h1>
            <p className="text-gray-600 mt-2">
              View historical campaign data. Showing {filteredArchives.length} of {archives.length} campaigns.
            </p>
          </div>
          <Link
            href="/admin/campaign"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            ← Back to Campaign
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {filteredArchives.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-600 text-lg">
              {archives.length === 0
                ? "No archived campaigns yet. Start a new campaign to create your first archive."
                : "No campaigns match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredArchives.map((archive) => (
              <div
                key={archive.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {archive.campaign_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Archived {formatDate(archive.archived_at)}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Orders</p>
                        <p className="text-lg font-bold text-gray-900">
                          {archive.total_orders}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Items</p>
                        <p className="text-lg font-bold text-gray-900">
                          {archive.total_items}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Revenue</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${archive.total_revenue_usd.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          {daysUntilDelete(archive.delete_at) === 0 ? "Expires" : "Expires In"}
                        </p>
                        <p className="text-lg font-bold text-amber-600">
                          {daysUntilDelete(archive.delete_at) === 0
                            ? "Today"
                            : `${daysUntilDelete(archive.delete_at)} days`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(archive)}
                    className="ml-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {showDetails && selectedArchive && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedArchive.campaign_name}
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedArchive.total_orders}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedArchive.total_items}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${selectedArchive.total_revenue_usd.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Expires</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {daysUntilDelete(selectedArchive.delete_at)} days
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-xs text-gray-500 uppercase mb-2">Archived At</p>
                  <p className="text-gray-900">{formatDate(selectedArchive.archived_at)}</p>
                </div>

                <div className="text-center py-6 text-gray-600">
                  <p className="mb-3">Detailed order view coming soon</p>
                  <p className="text-sm">
                    For now, you can see campaign summaries and total metrics above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PasswordGate>
  );
}
