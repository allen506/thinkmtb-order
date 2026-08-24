"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import EmailNotificationSettings from "@/components/EmailNotificationSettings";

export default function SettingsPage() {
  const [retentionDays, setRetentionDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchRetentionSetting = useCallback(async () => {
    try {
      const res = await fetch("/api/app-settings");
      const json = await res.json();
      const days = parseInt(json.archive_retention_days || "365", 10);
      setRetentionDays(days);
    } catch (err) {
      console.error("Failed to fetch retention setting:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRetentionSetting();
  }, [fetchRetentionSetting]);

  const handleSaveRetention = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive_retention_days: retentionDays.toString() }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("✓ Retention setting saved successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save setting");
      }
    } catch (err) {
      console.error("Failed to save retention:", err);
      setMessage("Error saving setting");
    } finally {
      setSaving(false);
    }
  };

  const retentionMonths = Math.round(retentionDays / 30.44);

  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Settings</h1>

          {/* Archive Retention Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Archive Retention</h2>
            <p className="text-sm text-gray-600 mb-6">
              Archives are automatically created when you start a new campaign. Configure how long to keep them before automatic deletion.
            </p>

            {!loading && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retention Period: <span className="font-bold text-amber-600">{retentionMonths} month{retentionMonths !== 1 ? 's' : ''}</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="365"
                    step="30"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>1 month</span>
                    <span>6 months</span>
                    <span>12 months</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  Archives will be kept for <strong>{retentionDays} days</strong> ({retentionMonths} month{retentionMonths !== 1 ? 's' : ''}) before automatic deletion.
                </p>

                <button
                  onClick={handleSaveRetention}
                  disabled={saving}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Retention Setting"}
                </button>

                {message && (
                  <p className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                    {message}
                  </p>
                )}
              </div>
            )}
          </div>

          <EmailNotificationSettings />
        </div>
      </div>
    </PasswordGate>
  );
}
