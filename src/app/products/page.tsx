"use client";

import { useState, useEffect } from "react";
import PasswordGate from "@/components/PasswordGate";
import ProductManager from "@/components/ProductManager";
import DesignManager from "@/components/DesignManager";
import ProductDesignAssociations from "@/components/ProductDesignAssociations";
import PricingTierManager from "@/components/PricingTierManager";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<
    "products" | "designs" | "product-designs" | "pricing-tiers"
  >("products");

  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="Products Management" checkOrderingStatus={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Products</h1>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto w-fit">
          {(
            [
              ["products", "Product Types"],
              ["designs", "Designs"],
              ["product-designs", "Product ↔ Designs"],
              ["pricing-tiers", "Pricing Manager"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeTab === "products" && <ProductManager />}
          {activeTab === "designs" && <DesignManager />}
          {activeTab === "product-designs" && <ProductDesignAssociations />}
          {activeTab === "pricing-tiers" && <PricingTierManager />}
        </div>
      </div>
    </PasswordGate>
  );
}
