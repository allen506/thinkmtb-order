"use client";

import PasswordGate from "@/components/PasswordGate";
import PaymentsAdmin from "@/components/PaymentsAdmin";

export default function PaymentsPage() {
  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="Admin Payments" checkOrderingStatus={false}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
            <p className="text-gray-600">View and manage all payment submissions</p>
          </div>
          <PaymentsAdmin />
        </div>
      </div>
    </PasswordGate>
  );
}
