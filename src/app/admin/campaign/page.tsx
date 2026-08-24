"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import Link from "next/link";

export default function CampaignPage() {
  const [orderingActive, setOrderingActive] = useState(true);
  const [startingNewCampaign, setStartingNewCampaign] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archiveRetentionDays, setArchiveRetentionDays] = useState(365);
  const [savingRetention, setSavingRetention] = useState(false);

  const fetchOrderingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/app-settings");
      const json = await res.json();
      setOrderingActive(json.ordering_active === 1);
      setArchiveRetentionDays(parseInt(json.archive_retention_days || "365", 10));
    } catch (err) {
      console.error("Failed to fetch ordering status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleOrderingStatus = useCallback(async () => {
    setTogglingStatus(true);
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordering_active: orderingActive ? 0 : 1 }),
      });
      if (res.ok) {
        setOrderingActive(!orderingActive);
      }
    } catch (err) {
      console.error("Failed to toggle ordering status:", err);
    } finally {
      setTogglingStatus(false);
    }
  }, [orderingActive]);

  const handleSaveRetention = useCallback(async () => {
    setSavingRetention(true);
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive_retention_days: archiveRetentionDays.toString() }),
      });
      if (res.ok) {
        alert("✓ Archive retention setting saved!");
      } else {
        alert("Failed to save setting");
      }
    } catch (err) {
      console.error("Failed to save retention setting:", err);
      alert("Error saving setting");
    } finally {
      setSavingRetention(false);
    }
  }, [archiveRetentionDays]);

  const handleStartNewCampaign = useCallback(async () => {
    if (
      !confirm(
        "⚠️ Start a NEW order campaign?\n\nThis will:\n- ARCHIVE all current orders (kept for " + archiveRetentionDays + " days)\n- Reset the order counter\n- Enable ordering for the new campaign\n\nYou can view archived campaigns in the Archives section."
      )
    ) {
      return;
    }

    setStartingNewCampaign(true);
    try {
      const res = await fetch("/api/orders/new-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        alert("✓ New campaign started!\nAll designs and products are ready.");
        await fetchOrderingStatus();
      } else {
        alert("Failed to start new campaign: " + json.error);
      }
    } catch (err) {
      console.error("Failed to start new campaign:", err);
      alert("Error starting new campaign");
    } finally {
      setStartingNewCampaign(false);
    }
  }, [fetchOrderingStatus]);

  useEffect(() => {
    fetchOrderingStatus();
  }, [fetchOrderingStatus]);

  if (loading) {
    return (
      <PasswordGate
        password=""
        storageKey="auth-admin"
        verifyEndpoint="/api/admin/verify-password"
        title="Campaign Management"
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
      title="Campaign Management"
      checkOrderingStatus={false}
    >
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Management</h1>
        <p className="text-gray-600 mb-8">Manage your team order campaigns, control ordering status, and configure archive settings.</p>

        <div className="space-y-6">
          {/* Order Status Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Status</h2>
            <p className="text-sm text-gray-600 mb-6">
              {orderingActive
                ? "Ordering is currently open. Team members can place and modify orders."
                : "Ordering is currently closed. Team members cannot place new orders."}
            </p>
            <button
              onClick={toggleOrderingStatus}
              disabled={togglingStatus}
              className={`px-6 py-3 rounded-xl font-medium transition-colors text-base ${
                orderingActive
                  ? "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {togglingStatus ? "Updating…" : orderingActive ? "✓ Ordering Open" : "✗ Ordering Closed"}
            </button>
          </div>

          {/* Archive Retention Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Archive Retention</h2>
            <p className="text-sm text-gray-600 mb-6">
              When you start a new campaign, current orders are archived for future reference. Archived campaigns older than the retention period will be automatically deleted.
            </p>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keep archived campaigns for:
                </label>
                <select
                  value={archiveRetentionDays}
                  onChange={(e) => setArchiveRetentionDays(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value={30}>1 month</option>
                  <option value={60}>2 months</option>
                  <option value={90}>3 months</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year (default)</option>
                </select>
              </div>
              <button
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="self-end px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {savingRetention ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Campaigns archived after {new Date(new Date().getTime() + archiveRetentionDays * 24 * 60 * 60 * 1000).toLocaleDateString()} will be deleted.
            </p>
          </div>

          {/* Archives Link */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 View Archives</h2>
            <p className="text-sm text-gray-600 mb-6">
              View all archived campaigns and their order details. Only admins can access this section.
            </p>
            <Link
              href="/admin/archives"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Browse Archives →
            </Link>
          </div>

          {/* New Campaign Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Start New Campaign</h2>
            <p className="text-sm text-gray-600 mb-6">
              Begin a fresh campaign cycle. Current orders will be archived and the order counter will be reset.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>ℹ️ Info:</strong> Orders will be archived for <strong>{archiveRetentionDays} days</strong> and then automatically deleted. You can view archived campaigns anytime.
              </p>
            </div>
            <button
              onClick={handleStartNewCampaign}
              disabled={startingNewCampaign}
              className="px-6 py-3 rounded-xl font-medium transition-colors text-base bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingNewCampaign ? "Starting…" : "🔄 Start New Campaign"}
            </button>
          </div>
        </div>
      </div>
    </PasswordGate>
  );
}
