"use client";

import { useState, useEffect, useCallback } from "react";
import { PRICING } from "@/lib/pricing";
import PricingTable from "@/components/PricingTable";
import PasswordGate from "@/components/PasswordGate";
import * as XLSX from "xlsx";

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
    quantity: number;
  }[];
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
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "breakdown" | "pricing"
  >("overview");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/summary");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const exportToExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: All Orders (one row per item)
    const orderRows = data.orders.flatMap((order) =>
      order.items.map((item) => ({
        Name: order.user_name,
        Status: order.status,
        "Order Date": new Date(order.created_at).toLocaleDateString(),
        Product: item.product_name,
        Design: item.design_name,
        Size: item.size_name,
        Qty: item.quantity,
      }))
    );
    const wsOrders = XLSX.utils.json_to_sheet(orderRows);
    XLSX.utils.book_append_sheet(wb, wsOrders, "All Orders");

    // Sheet 2: By Product
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

    // Sheet 3: Full Breakdown
    const breakdownRows = data.summary.fullBreakdown.map((item) => ({
      Product: item.product_name,
      Design: item.design_name,
      Size: item.size_name,
      "Total Qty": item.total_qty,
    }));
    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownRows);
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Full Breakdown");

    XLSX.writeFile(wb, `ThinkMTB_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <PasswordGate password="thinkmtb123" storageKey="auth-admin" title="TeamTotals Admin">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </PasswordGate>
    );
  }

  if (!data) {
    return (
      <PasswordGate password="thinkmtb123" storageKey="auth-admin" title="TeamTotals Admin">
        <div className="text-center py-20 text-black">
          Failed to load admin data.
        </div>
      </PasswordGate>
    );
  }

  const { summary, orders } = data;

  return (
    <PasswordGate password="thinkmtb123" storageKey="auth-admin" title="TeamTotals Admin">
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            📥 Export to Excel
          </button>
          <button
            onClick={fetchData}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
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

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto w-fit max-w-full">
        {(
          [
            ["overview", "Overview"],
            ["orders", "All Orders"],
            ["breakdown", "Full Breakdown"],
            ["pricing", "Pricing Tiers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-white shadow-sm text-gray-900"
                : "text-black hover:text-black"
            }`}
          >
            {label}
          </button>
        ))}
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

          {/* By Design & Size side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <option value="confirmed">Confirmed</option>
                      <option value="paid">Paid</option>
                      <option value="ordered">Ordered from CMS</option>
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
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-black min-w-[400px]">
                  <thead>
                    <tr className="text-black border-b border-gray-100">
                      <th className="px-4 sm:px-6 py-2 text-left">Product</th>
                      <th className="px-4 sm:px-6 py-2 text-left">Design</th>
                      <th className="px-4 sm:px-6 py-2 text-left">Size</th>
                      <th className="px-4 sm:px-6 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50"
                      >
                        <td className="px-6 py-2">{item.product_name}</td>
                        <td className="px-6 py-2">{item.design_name}</td>
                        <td className="px-6 py-2">{item.size_name}</td>
                        <td className="px-6 py-2 text-right font-medium">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    {order.id.slice(0, 8)}...
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

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <p className="text-sm text-black">
            Current pricing tiers. The highlighted tier shows the current price
            based on total team order quantity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PRICING).map(([productId, tiers]) => {
              const productQty =
                summary.byProduct.find(
                  (p) => p.product_type_id === productId
                )?.total_qty || 0;
              const productName =
                summary.byProduct.find(
                  (p) => p.product_type_id === productId
                )?.product_name ||
                productId;
              return (
                <div key={productId}>
                  <PricingTable
                    productTypeId={productId}
                    productName={productName}
                    tiers={tiers}
                    currentTotalQty={productQty}
                  />
                  <p className="text-xs text-black mt-2 text-center">
                    Current total: <strong>{productQty}</strong> units
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </PasswordGate>
  );
}
