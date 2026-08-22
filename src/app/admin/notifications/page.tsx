"use client";

import PasswordGate from "@/components/PasswordGate";
import EmailNotificationSettings from "@/components/EmailNotificationSettings";

export default function NotificationsPage() {
  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="Admin Email Notifications" checkOrderingStatus={false}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Notifications</h1>
            <p className="text-gray-600">Configure SMTP and manage admin notifications</p>
          </div>
          <EmailNotificationSettings />
        </div>
      </div>
    </PasswordGate>
  );
}
