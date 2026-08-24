"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";

export default function CampaignPage() {
  const [orderingActive, setOrderingActive] = useState(true);
  const [startingNewCampaign, setStartingNewCampaign] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrderingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/app-settings");
      const json = await res.json();
      setOrderingActive(json.ordering_active === 1);
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

  const handleStartNewCampaign = useCallback(async () => {
    if (
      !confirm(
        "⚠️ Start a NEW order campaign?\n\nThis will:\n- DELETE all current orders\n- Reset the order counter\n- Enable ordering for the new campaign\n\nThis cannot be undone!"
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
        <p className="text-gray-600 mb-8">Manage your team order campaigns and control ordering status.</p>

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

          {/* New Campaign Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Start New Campaign</h2>
            <p className="text-sm text-gray-600 mb-6">
              Begin a fresh campaign cycle. This will delete all current orders and reset the order counter.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Warning:</strong> This action cannot be undone. All current orders and data will be permanently deleted.
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
