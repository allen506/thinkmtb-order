"use client";

import Link from "next/link";
import OrderForm from "@/components/OrderForm";
import PasswordGate from "@/components/PasswordGate";

export default function OrderPage() {
  return (
    <PasswordGate password={["thinkmtb-go", "thinkmtb123"]} storageKey="auth-user" title="ThinkMTB Orders" checkOrderingStatus={true}>
      <div>
        <div className="mb-8">
          <Link href="/user" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-3">Place Your Order</h1>
          <p className="text-gray-400 text-sm mt-1">
            Products by{" "}
            <a href="https://www.cmssportswear.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">CMS Sportswear</a>
          </p>
        </div>

        <OrderForm onOrderPlaced={() => {}} />
      </div>
    </PasswordGate>
  );
}
