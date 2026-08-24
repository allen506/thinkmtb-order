"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import EmailNotificationSettings from "@/components/EmailNotificationSettings";

export default function SettingsPage() {
  const [retentionDays, setRetentionDays] = useState(365);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTimeout, setMessageTimeout] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/app-settings");
      const json = await res.json();
      const days = parseInt(json.archive_retention_days || "365", 10);
      const timeout = parseInt(json.session_timeout_minutes || "15", 10);
      setRetentionDays(days);
      setSessionTimeoutMinutes(timeout);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  const handleSaveTimeout = async () => {
    setSavingTimeout(true);
    setMessageTimeout("");
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_timeout_minutes: sessionTimeoutMinutes.toString() }),
      });
      const json = await res.json();
      if (json.success) {
        setMessageTimeout("✓ Session timeout setting saved successfully");
        setTimeout(() => setMessageTimeout(""), 3000);
      } else {
        setMessageTimeout("Failed to save setting");
      }
    } catch (err) {
      console.error("Failed to save timeout:", err);
      setMessageTimeout("Error saving setting");
    } finally {
      setSavingTimeout(false);
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

          {/* Session Timeout Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Session Timeout</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure how long users can stay logged in without activity. When the idle time is exceeded, a warning will appear allowing them to stay logged in or they'll be automatically logged out.
            </p>

            {!loading && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-logout after: <span className="font-bold text-blue-600">{sessionTimeoutMinutes} minutes</span>
                  </label>
                  <select
                    value={sessionTimeoutMinutes}
                    onChange={(e) => setSessionTimeoutMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes (default)</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>ℹ️ Note:</strong> Users will receive a 2-minute warning before being logged out due to inactivity. They can click "Stay Logged In" to continue their session.
                  </p>
                </div>

                <button
                  onClick={handleSaveTimeout}
                  disabled={savingTimeout}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingTimeout ? "Saving..." : "Save Timeout Setting"}
                </button>

                {messageTimeout && (
                  <p className={`text-sm ${messageTimeout.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                    {messageTimeout}
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
