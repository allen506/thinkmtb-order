"use client";

import PasswordGate from "@/components/PasswordGate";
import EmailNotificationSettings from "@/components/EmailNotificationSettings";

export default function SettingsPage() {
  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Settings</h1>
          <EmailNotificationSettings />
        </div>
      </div>
    </PasswordGate>
  );
}
