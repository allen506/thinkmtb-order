"use client";

import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import ProductManager from "@/components/ProductManager";
import DesignManager from "@/components/DesignManager";
import PricingTierManager from "@/components/PricingTierManager";
import PricingTiersViewer from "@/components/PricingTiersViewer";
import ProductDesignAssociations from "@/components/ProductDesignAssociations";
import SubmittedPayments from "@/components/SubmittedPayments";
import * as XLSX from "xlsx";

function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { setIsError(true); setMsg("New passwords don't match"); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/cmsadmin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setIsError(false); setMsg("Password updated!"); setCurrent(""); setNext(""); setConfirm(""); }
    else { setIsError(true); setMsg(data.error || "Failed"); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
        🔑 Change Password
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Change Admin Password</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
            <input type="password" required value={current} onChange={e => setCurrent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <input type="password" required minLength={6} value={next} onChange={e => setNext(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          </div>
          {msg && <p className={`text-xs ${isError ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-40">
              {saving ? "Saving…" : "Update Password"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setMsg(""); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Payments Admin ───────────────────────────────────────────────────────────
interface ProductSummary {
  product_type_id: string;
  product_name: string;
  total_qty: number;
  tierPriceCRC: number;
  tierPriceUSD: number;
  totalCRC: number;
  totalUSD: number;
}

interface DesignSummary {
  design_id: string;
  design_name: string;
  total_qty: number;
}

interface SizeSummary {
  size_id: string;
  size_name: string;
  total_qty: number;
}

interface BreakdownItem {
  product_type_id: string;
  product_name: string;
  design_id: string;
  design_name: string;
  size_id: string;
  size_name: string;
  total_qty: number;
}

interface OrderDetail {
  id: string;
  order_number: string;
  user_name: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  total_qty: number;
  items: {
    id: number;
    product_type_id: string;
    product_name: string;
    design_id: string;
    design_name: string;
    size_id: string;
    size_name: string;
    sleeve_length?: string | null;
    quantity: number;
  }[];
}

interface UserTotal {
  userName: string;
  items: {
    productName: string;
    designName: string;
    sizeName: string;
    fit: string;
    quantity: number;
    unitPriceUSD: number;
    totalUSD: number;
  }[];
  grandTotalUSD: number;
}

interface AdminData {
  summary: {
    totalOrders: number;
    totalItems: number;
    byProduct: ProductSummary[];
    byDesign: DesignSummary[];
    bySize: SizeSummary[];
    fullBreakdown: BreakdownItem[];
  };
  orders: OrderDetail[];
  exchangeRate: number;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "breakdown" | "pricing" | "per-person" | "payments"
  >("overview");
  const [userTotals, setUserTotals] = useState<UserTotal[]>([]);
  const [userTotalsLoading, setUserTotalsLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Catalog for inline item editing
  const [catalog, setCatalog] = useState<{ productTypes: any[]; designs: any[]; sizes: any[]; productDesigns: any[] }>({ productTypes: [], designs: [], sizes: [], productDesigns: [] });
  // Admin order editing state
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ productTypeId: string; designId: string; sizeId: string; fit: string; quantity: number }>({ productTypeId: "", designId: "", sizeId: "", fit: "", quantity: 1 });
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);
  const [addingToOrder, setAddingToOrder] = useState<string | null>(null);
  const [addFields, setAddFields] = useState<{ productTypeId: string; designId: string; sizeId: string; fit: string; quantity: number }>({ productTypeId: "", designId: "", sizeId: "", fit: "", quantity: 1 });
  const [addingItem, setAddingItem] = useState(false);

  const fetchUserTotals = useCallback(async () => {
    setUserTotalsLoading(true);
    try {
      const res = await fetch("/api/orders/user-totals");
      const json = await res.json();
      setUserTotals(json.userTotals || []);
    } catch {
      // non-fatal
    } finally {
      setUserTotalsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, catalogRes] = await Promise.all([
        fetch("/api/cmsadmin/summary"),
        fetch("/api/catalog"),
      ]);
      const summary = await summaryRes.json();
      const catalogData = await catalogRes.json();
      setData(summary);
      setCatalog(catalogData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAsPaid = async (orderId: string) => {
    setMarkingPaid(orderId);
    try {
      const res = await fetch(`/api/cmsadmin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (res.ok) {
        fetchData();
      }
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Delete this item?")) return;
    setDeletingItem(itemId);
    try {
      const res = await fetch(`/api/cmsadmin/orders/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } finally {
      setDeletingItem(null);
    }
  };

  const handleSaveItem = async (itemId: number) => {
    setSavingItem(true);
    try {
      const res = await fetch(`/api/cmsadmin/orders/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchData();
      }
    } finally {
      setSavingItem(false);
    }
  };

  const handleAddItem = async (orderId: string) => {
    setAddingItem(true);
    try {
      const res = await fetch("/api/cmsadmin/orders/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addFields, orderId }),
      });
      if (res.ok) {
        setAddingToOrder(null);
        fetchData();
      }
    } finally {
      setAddingItem(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <ChangePasswordButton />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-4 overflow-x-auto">
            {(["overview", "orders", "breakdown", "pricing", "per-person", "payments"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "overview"
                  ? "📊 Overview"
                  : tab === "orders"
                  ? "📦 Orders"
                  : tab === "breakdown"
                  ? "📋 Full Breakdown"
                  : tab === "pricing"
                  ? "💰 Pricing"
                  : tab === "per-person"
                  ? "👥 Per-Person"
                  : "💳 Payments"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "overview" && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{data.summary.totalOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{data.summary.totalItems}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-sm">Exchange Rate</p>
                <p className="text-3xl font-bold text-gray-900">₡{data.exchangeRate.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 mb-4">By Product</h3>
                <div className="space-y-2">
                  {data.summary.byProduct.map((product) => (
                    <div key={product.product_type_id} className="flex justify-between text-sm">
                      <span>{product.product_name}</span>
                      <span className="font-medium">{product.total_qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 mb-4">By Design</h3>
                <div className="space-y-2">
                  {data.summary.byDesign.map((design) => (
                    <div key={design.design_id} className="flex justify-between text-sm">
                      <span>{design.design_name}</span>
                      <span className="font-medium">{design.total_qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === "pricing" && <PricingTierManager />}

        {/* Other tabs placeholder */}
        {activeTab !== "overview" && activeTab !== "pricing" && (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            <p>{activeTab} section coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
