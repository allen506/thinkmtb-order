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
    const res = await fetch("/api/admin/change-password", {
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
        fetch("/api/admin/summary"),
        fetch("/api/catalog"),
      ]);
      const json = await summaryRes.json();
      const cat = await catalogRes.json();
      setData(json);
      setCatalog({ productTypes: cat.productTypes || [], designs: cat.designs || [], sizes: cat.sizes || [], productDesigns: cat.productDesigns || [] });
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAllPaid = useCallback(async (userName: string, orderIds: string[]) => {
    setMarkingPaid(userName);
    try {
      await Promise.all(
        orderIds.map((id) =>
          fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "paid" }),
          })
        )
      );
      await Promise.all([fetchData(), fetchUserTotals()]);
    } finally {
      setMarkingPaid(null);
    }
  }, [fetchData, fetchUserTotals]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "per-person") fetchUserTotals();
  }, [activeTab, fetchUserTotals]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    fetchData();
  };

  const exportToExcel = async () => {
    if (!data) return;

    // Ensure per-person totals are loaded before exporting
    let totals = userTotals;
    if (totals.length === 0) {
      try {
        const res = await fetch("/api/orders/user-totals");
        const json = await res.json();
        totals = json.userTotals || [];
        setUserTotals(totals);
      } catch { totals = []; }
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Per Person (for collecting money)
    const perPersonRows: any[] = [];
    totals
      .slice()
      .sort((a, b) => a.userName.localeCompare(b.userName))
      .forEach((user) => {
        perPersonRows.push({
          Name: user.userName,
          Product: "",
          Design: "",
          Size: "",
          Qty: "",
          "Unit Price (USD)": "",
          "Total (USD)": "",
          Notes: `TOTAL FOR ${user.userName.toUpperCase()}`,
        });
        user.items.forEach((item) => {
          perPersonRows.push({
            Name: "",
            Product: item.productName,
            Design: item.designName,
            Size: item.sizeName,
            "Fit / Gender": item.fit || "",
            Qty: item.quantity,
            "Unit Price (USD)": item.unitPriceUSD.toFixed(2),
            "Total (USD)": item.totalUSD.toFixed(2),
            Notes: "",
          });
        });
        perPersonRows.push({
          Name: "",
          Product: "",
          Design: "",
          Size: "",
          Qty: "",
          "Unit Price (USD)": "",
          "Total (USD)": user.grandTotalUSD.toFixed(2),
          Notes: `Amount Due: $${user.grandTotalUSD.toFixed(2)}`,
        });
        perPersonRows.push({
          Name: "",
          Product: "",
          Design: "",
          Size: "",
          Qty: "",
          "Unit Price (USD)": "",
          "Total (USD)": "",
          Notes: "",
        });
      });
    const wsPerPerson = XLSX.utils.json_to_sheet(perPersonRows);
    XLSX.utils.book_append_sheet(wb, wsPerPerson, "Per Person");

    // Sheet 2: All Orders (one row per item)
    const orderRows = data.orders.flatMap((order) =>
      order.items.map((item) => ({
        "Order #": order.order_number || '',
        Name: order.user_name,
        Status: order.status,
        "Order Date": new Date(order.created_at).toLocaleDateString(),
        Product: item.product_name,
        Design: item.design_name,
        Size: item.size_name,
        "Fit / Gender": (item as any).fit || "",
        Sleeve: item.sleeve_length
          ? item.sleeve_length.charAt(0).toUpperCase() + item.sleeve_length.slice(1)
          : "",
        Qty: item.quantity,
      }))
    );
    const wsOrders = XLSX.utils.json_to_sheet(orderRows);
    XLSX.utils.book_append_sheet(wb, wsOrders, "All Orders");

    // Sheet 3: By Product
    const productRows = data.summary.byProduct.map((p) => ({
      Product: p.product_name,
      "Total Qty": p.total_qty,
      "Unit Price (CRC)": p.tierPriceCRC,
      "Unit Price (USD)": p.tierPriceUSD,
      "Total (CRC)": p.totalCRC,
      "Total (USD)": p.totalUSD,
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb, wsProducts, "By Product");

    // Sheet 4: Full Breakdown
    const breakdownRows = data.summary.fullBreakdown.map((item) => ({
      Product: item.product_name,
      Design: item.design_name,
      Size: item.size_name,
      "Fit / Gender": (item as any).fit || "",
      "Total Qty": item.total_qty,
    }));
    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownRows);
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Full Breakdown");

    XLSX.writeFile(wb, `ThinkMTB_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="TeamTotals Admin" checkOrderingStatus={false}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </PasswordGate>
    );
  }

  if (!data || !data.summary) {
    return (
      <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="TeamTotals Admin" checkOrderingStatus={false}>
        <div className="text-center py-20 text-black">
          Failed to load admin data. Please try refreshing the page.
        </div>
      </PasswordGate>
    );
  }

  const { summary, orders } = data;

  const adminSaveItem = async (itemId: number) => {
    setSavingItem(true);
    await fetch(`/api/orders/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productTypeId: editFields.productTypeId, designId: editFields.designId, sizeId: editFields.sizeId, fit: editFields.fit, quantity: editFields.quantity }) });
    setSavingItem(false);
    setEditingItem(null);
    fetchData();
  };

  const adminDeleteItem = async (itemId: number) => {
    if (!confirm("Remove this item from the order?")) return;
    setDeletingItem(itemId);
    await fetch(`/api/orders/items/${itemId}`, { method: "DELETE" });
    setDeletingItem(null);
    fetchData();
  };

  const adminAddItem = async (orderId: string) => {
    if (!addFields.productTypeId || !addFields.designId || !addFields.sizeId) return;
    setAddingItem(true);
    await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userName: orders.find(o => o.id === orderId)?.user_name || "", items: [{ productTypeId: addFields.productTypeId, designId: addFields.designId, sizeId: addFields.sizeId, fit: addFields.fit, quantity: addFields.quantity }] }) });
    setAddingItem(false);
    setAddingToOrder(null);
    setAddFields({ productTypeId: "", designId: "", sizeId: "", fit: "", quantity: 1 });
    fetchData();
  };

  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="TeamTotals Admin" checkOrderingStatus={false}>
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Team Totals</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-medium"
          >
            Export to Excel
          </button>
          <button
            onClick={fetchData}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-500 px-4 py-2 rounded-xl transition-colors"
          >
            ↻ Refresh
          </button>
          <ChangePasswordButton />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-black">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">
            {summary.totalOrders}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-black">Total Items</p>
          <p className="text-3xl font-bold text-gray-900">
            {summary.totalItems}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-black">Est. Total (CRC)</p>
          <p className="text-3xl font-bold text-green-700">
            ₡
            {summary.byProduct
              .reduce((s, p) => s + p.totalCRC, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-black">Est. Total (USD)</p>
          <p className="text-3xl font-bold text-blue-700">
            $
            {summary.byProduct
              .reduce((s, p) => s + p.totalUSD, 0)
              .toFixed(2)}
          </p>
        </div>
      </div>

      {/* Team Totals Section */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team Totals</h3>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-fit max-w-full scrollbar-hide">
          {(
            [
              ["overview", "Overview"],
              ["orders", "All Orders"],
              ["breakdown", "Full Breakdown"],
              ["per-person", "Per Person"],
              ["payments", "Payments"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap touch-highlight ${
                activeTab === key
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-black hover:text-black active:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* By Product */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-black">By Product Type</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-black min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 text-black">
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-right">Total Qty</th>
                  <th className="px-6 py-3 text-right">Unit Price (CRC)</th>
                  <th className="px-6 py-3 text-right">Unit Price (USD)</th>
                  <th className="px-6 py-3 text-right">Total (CRC)</th>
                  <th className="px-6 py-3 text-right">Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProduct.map((p) => (
                  <tr
                    key={p.product_type_id}
                    className="border-b border-gray-50"
                  >
                    <td className="px-6 py-3 font-medium">{p.product_name}</td>
                    <td className="px-6 py-3 text-right font-bold">
                      {p.total_qty}
                    </td>
                    <td className="px-6 py-3 text-right">
                      ₡{p.tierPriceCRC.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      ${p.tierPriceUSD.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-green-700">
                      ₡{p.totalCRC.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-blue-700">
                      ${p.totalUSD.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {summary.byProduct.length > 0 && (
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-6 py-3">TOTAL</td>
                    <td className="px-6 py-3 text-right">
                      {summary.byProduct.reduce((s, p) => s + p.total_qty, 0)}
                    </td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3 text-right text-green-700">
                      ₡
                      {summary.byProduct
                        .reduce((s, p) => s + p.totalCRC, 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-blue-700">
                      $
                      {summary.byProduct
                        .reduce((s, p) => s + p.totalUSD, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            {summary.byProduct.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-600">
                No orders yet.
              </p>
            )}
          </div>

          {/* By Design, Size & Fit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-black">By Design</h3>
              </div>
              <table className="w-full text-sm text-black">
                <thead>
                  <tr className="border-b border-gray-100 text-black">
                    <th className="px-6 py-3 text-left">Design</th>
                    <th className="px-6 py-3 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byDesign.map((d) => (
                    <tr
                      key={d.design_id}
                      className="border-b border-gray-50"
                    >
                      <td className="px-6 py-3 font-medium">
                        {d.design_name}
                      </td>
                      <td className="px-6 py-3 text-right font-bold">
                        {d.total_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.byDesign.length === 0 && (
                <p className="px-6 py-8 text-center text-gray-600">
                  No orders yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-black">By Size</h3>
              </div>
              <table className="w-full text-sm text-black">
                <thead>
                  <tr className="border-b border-gray-100 text-black">
                    <th className="px-6 py-3 text-left">Size</th>
                    <th className="px-6 py-3 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bySize.map((s) => (
                    <tr
                      key={s.size_id}
                      className="border-b border-gray-50"
                    >
                      <td className="px-6 py-3 font-medium">{s.size_name}</td>
                      <td className="px-6 py-3 text-right font-bold">
                        {s.total_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.bySize.length === 0 && (
                <p className="px-6 py-8 text-center text-gray-600">
                  No orders yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-black">By Fit</h3>
              </div>
              <table className="w-full text-sm text-black">
                <thead>
                  <tr className="border-b border-gray-100 text-black">
                    <th className="px-6 py-3 text-left">Fit / Gender</th>
                    <th className="px-6 py-3 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {((summary as any).byFit || []).map((f: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-6 py-3 font-medium capitalize">{f.fit}</td>
                      <td className="px-6 py-3 text-right font-bold">{f.total_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {((summary as any).byFit || []).length === 0 && (
                <p className="px-6 py-8 text-center text-gray-600">No orders yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-600">
              No orders placed yet.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-black">
                      {order.user_name}
                      {order.order_number && (
                        <span className="ml-2 text-xs font-mono text-gray-500">{order.order_number}</span>
                      )}
                    </h4>
                    <p className="text-xs text-black">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 outline-none cursor-pointer ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-400 hover:text-red-600 text-sm transition-colors"
                      title="Delete order"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {order.items.map((item) => (
                    <div key={item.id} className="px-5 py-3">
                      {editingItem === item.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Product</label>
                              <select value={editFields.productTypeId} onChange={e => setEditFields(f => ({ ...f, productTypeId: e.target.value, designId: "", fit: "" }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-gray-50">
                                {catalog.productTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Design</label>
                              <select value={editFields.designId} onChange={e => setEditFields(f => ({ ...f, designId: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-gray-50">
                                <option value="">— select —</option>
                                {catalog.productDesigns.filter(pd => pd.product_type_id === editFields.productTypeId).map(pd => {
                                  const design = catalog.designs.find(d => d.id === pd.design_id);
                                  return design ? <option key={design.id} value={design.id}>{design.name}</option> : null;
                                })}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Size</label>
                              <select value={editFields.sizeId} onChange={e => setEditFields(f => ({ ...f, sizeId: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-gray-50">
                                {catalog.sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            {(() => {
                              const product = catalog.productTypes.find(p => p.id === editFields.productTypeId);
                              const fitOptions: string[] = product?.fit_options ? JSON.parse(product.fit_options) : [];
                              return fitOptions.length > 1 ? (
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Fit</label>
                                  <select value={editFields.fit} onChange={e => setEditFields(f => ({ ...f, fit: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-gray-50">
                                    <option value="">— select —</option>
                                    {fitOptions.map(fitOpt => <option key={fitOpt} value={fitOpt}>{fitOpt.charAt(0).toUpperCase() + fitOpt.slice(1)}</option>)}
                                  </select>
                                </div>
                              ) : null;
                            })()}
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Qty</label>
                              <input type="number" min={1} max={50} value={editFields.quantity} onChange={e => setEditFields(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-gray-50" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => adminSaveItem(item.id)} disabled={savingItem || !editFields.designId || !editFields.sizeId} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">{savingItem ? "Saving…" : "Save"}</button>
                            <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                            <span className="text-sm text-gray-400"> · {item.design_name} · {item.size_name}{(item as any).fit ? ` · ${(item as any).fit}` : ""} · qty {item.quantity}</span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setEditingItem(item.id); setEditFields({ productTypeId: item.product_type_id, designId: item.design_id, sizeId: item.size_id, fit: (item as any).fit || "", quantity: item.quantity }); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">Edit</button>
                            <button onClick={() => adminDeleteItem(item.id)} disabled={deletingItem === item.id} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40">{deletingItem === item.id ? "…" : "Remove"}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add item row */}
                  {addingToOrder === order.id ? (
                    <div className="px-5 py-3 bg-blue-50 space-y-2">
                      <p className="text-xs font-semibold text-blue-700">Add Item</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Product</label>
                          <select value={addFields.productTypeId} onChange={e => setAddFields(f => ({ ...f, productTypeId: e.target.value, designId: "", fit: "" }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white">
                            <option value="">— select —</option>
                            {catalog.productTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Design</label>
                          <select value={addFields.designId} onChange={e => setAddFields(f => ({ ...f, designId: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white">
                            <option value="">— select —</option>
                            {catalog.productDesigns.filter(pd => pd.product_type_id === addFields.productTypeId).map(pd => {
                              const design = catalog.designs.find(d => d.id === pd.design_id);
                              return design ? <option key={design.id} value={design.id}>{design.name}</option> : null;
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Size</label>
                          <select value={addFields.sizeId} onChange={e => setAddFields(f => ({ ...f, sizeId: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white">
                            <option value="">— select —</option>
                            {catalog.sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        {(() => {
                          const product = catalog.productTypes.find(p => p.id === addFields.productTypeId);
                          const fitOptions: string[] = product?.fit_options ? JSON.parse(product.fit_options) : [];
                          return fitOptions.length > 1 ? (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Fit</label>
                              <select value={addFields.fit} onChange={e => setAddFields(f => ({ ...f, fit: e.target.value }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white">
                                <option value="">— select —</option>
                                {fitOptions.map(fitOpt => <option key={fitOpt} value={fitOpt}>{fitOpt.charAt(0).toUpperCase() + fitOpt.slice(1)}</option>)}
                              </select>
                            </div>
                          ) : null;
                        })()}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          <input type="number" min={1} max={50} value={addFields.quantity} onChange={e => setAddFields(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => adminAddItem(order.id)} disabled={addingItem || !addFields.productTypeId || !addFields.designId || !addFields.sizeId} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">{addingItem ? "Adding…" : "Add Item"}</button>
                        <button onClick={() => setAddingToOrder(null)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-2">
                      <button onClick={() => setAddingToOrder(order.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">+ Add item</button>
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div className="px-6 py-2 bg-yellow-50 text-sm text-yellow-800">
                    <strong>Notes:</strong> {order.notes}
                  </div>
                )}
                <div className="px-4 sm:px-6 py-2 bg-gray-50 text-xs text-black flex justify-between">
                  <span>
                    Total qty: <strong>{order.total_qty}</strong>
                  </span>
                  <span className="font-mono text-black">
                    {order.order_number || order.id.slice(0, 8) + '...'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Breakdown Tab */}
      {activeTab === "breakdown" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-black">
              Full Breakdown (Product × Design × Size)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-black">
              <thead>
                <tr className="border-b border-gray-100 text-black">
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Design</th>
                  <th className="px-6 py-3 text-left">Size</th>
                  <th className="px-6 py-3 text-left">Fit</th>
                  <th className="px-6 py-3 text-right">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {summary.fullBreakdown.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-6 py-2 font-medium">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-2">{item.design_name}</td>
                    <td className="px-6 py-2">{item.size_name}</td>
                    <td className="px-6 py-2 capitalize text-gray-500">{(item as any).fit || <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-2 text-right font-bold">
                      {item.total_qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.fullBreakdown.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-600">
              No orders yet.
            </p>
          )}
        </div>
      )}

      {/* Per Person Tab */}
      {activeTab === "per-person" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-black">What each person owes based on current team pricing tiers.</p>
            <div className="flex gap-2">
              <button
                onClick={fetchUserTotals}
                disabled={userTotalsLoading}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {userTotalsLoading ? "Loading..." : "↻ Refresh"}
              </button>
              <button
                onClick={exportToExcel}
                disabled={userTotalsLoading || userTotals.length === 0}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                ↓ Download Excel
              </button>
            </div>
          </div>
          {userTotalsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
            </div>
          ) : userTotals.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">No orders yet.</div>
          ) : (
            userTotals
              .slice()
              .sort((a, b) => a.userName.localeCompare(b.userName))
              .map((user) => {
                // Derive this person's orders from the already-loaded orders data
                const personOrders = orders.filter(
                  (o) => o.user_name.toLowerCase().trim() === user.userName.toLowerCase().trim()
                );
                const allPaid = personOrders.length > 0 && personOrders.every((o) => o.status === "paid");
                const somePaid = !allPaid && personOrders.some((o) => o.status === "paid");
                const orderIds = personOrders.map((o) => o.id);
                const isMarking = markingPaid === user.userName;
                return (
                <div key={user.userName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{user.userName}</h4>
                      {allPaid ? (
                        <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">✓ Paid</span>
                      ) : somePaid ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2.5 py-1 rounded-full">Partially Paid</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 font-medium px-2.5 py-1 rounded-full">Unpaid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-700">${user.grandTotalUSD.toFixed(2)}</span>
                      {!allPaid && (
                        <button
                          onClick={() => handleMarkAllPaid(user.userName, orderIds)}
                          disabled={isMarking}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
                        >
                          {isMarking ? "Saving..." : "Mark All Paid"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-black">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                          <th className="px-6 py-2 text-left font-medium">Product</th>
                          <th className="px-6 py-2 text-left font-medium">Design</th>
                          <th className="px-6 py-2 text-left font-medium">Size</th>
                          <th className="px-6 py-2 text-right font-medium">Qty</th>
                          <th className="px-6 py-2 text-right font-medium">Unit $</th>
                          <th className="px-6 py-2 text-right font-medium">Total $</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="px-6 py-2">{item.productName}</td>
                            <td className="px-6 py-2">{item.designName}</td>
                            <td className="px-6 py-2">{item.sizeName}</td>
                            <td className="px-6 py-2 text-right">{item.quantity}</td>
                            <td className="px-6 py-2 text-right">${item.unitPriceUSD.toFixed(2)}</td>
                            <td className="px-6 py-2 text-right font-semibold">${item.totalUSD.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
              })
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && <SubmittedPayments />}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <PricingTiersViewer
          summary={summary}
          exchangeRate={data.exchangeRate}
        />
      )}

      {/* Products Tab — managed at /products */}

    </div>
    </PasswordGate>
  );
}
