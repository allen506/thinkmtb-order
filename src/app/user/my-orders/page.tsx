"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PasswordGate from "@/components/PasswordGate";
import { getUnitPriceCRC } from "@/lib/pricing";

const statusColors: { [key: string]: string } = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface CatalogSize { id: string; name: string; }
interface CatalogProduct { id: string; name: string; }
interface CatalogDesign { id: string; name: string; designed_for?: string; }

interface OrderItem {
  id: number;
  product_type_id: string;
  design_id: string;
  size_id: string;
  product_name: string;
  design_name: string;
  size_name: string;
  quantity: number;
}

interface OrderResult {
  id: string;
  order_number: string;
  user_name: string;
  status: string;
  notes: string;
  created_at: string;
  items: OrderItem[];
}

export default function UserMyOrdersPage() {
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [teamQty, setTeamQty] = useState<Record<string, number>>({});

  // Catalog for edit dropdowns
  const [sizes, setSizes] = useState<CatalogSize[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);

  // Edit state
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ productTypeId: string; designId: string; sizeId: string; quantity: number }>({
    productTypeId: "", designId: "", sizeId: "", quantity: 1,
  });
  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  // Payment state per order
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("zelle");
  const [payRef, setPayRef] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, any[]>>({});
  const [paySettings, setPaySettings] = useState<Record<string, string>>({});

  const fetchPaymentStatuses = useCallback((name: string) => {
    fetch(`/api/payments?userName=${encodeURIComponent(name)}`).then(r => r.json()).then(d => {
      const byOrder: Record<string, any[]> = {};
      for (const p of (d.payments || [])) {
        if (!byOrder[p.order_id]) byOrder[p.order_id] = [];
        byOrder[p.order_id].push(p);
      }
      setPaymentsByOrder(byOrder);
    }).catch(() => {});
  }, []);

  const fetchOrders = useCallback((name: string) => {
    setLoading(true);
    fetch(`/api/orders/search?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); })
      .catch(() => { setOrders([]); setLoading(false); });
  }, []);

  useEffect(() => {
    const name = localStorage.getItem("thinkmtb-user-name");
    if (name) { setUserName(name); fetchOrders(name); fetchPaymentStatuses(name); }

    // Load exchange rate and team quantities for pricing
    fetch("/api/exchange-rate").then(r => r.json()).then(d => { if (d.compra) setExchangeRate(d.compra); }).catch(() => {});
    fetch("/api/orders/team-quantities").then(r => r.json()).then(d => setTeamQty(d || {})).catch(() => {});
    fetch("/api/catalog").then(r => r.json()).then(d => {
      setSizes(d.sizes || []);
      setProducts(d.productTypes || []);
      setDesigns(d.designs || []);
    }).catch(() => {});
    fetch("/api/admin/payment-settings").then(r => r.json()).then(d => setPaySettings(d)).catch(() => {});

    // Poll payment statuses every 20 seconds so admin confirmations appear automatically
    const interval = setInterval(() => {
      const n = localStorage.getItem("thinkmtb-user-name");
      if (n) fetchPaymentStatuses(n);
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchPaymentStatuses]);

  const getItemPrice = (productTypeId: string, qty: number) => {
    if (!exchangeRate || !productTypeId) return null;
    const totalQty = (teamQty[productTypeId] || 0) + qty;
    const crc = getUnitPriceCRC(productTypeId, totalQty);
    if (!crc) return null;
    return { unitUSD: crc / exchangeRate, unitCRC: crc, totalUSD: (crc / exchangeRate) * qty, totalCRC: crc * qty };
  };

  const startEdit = (item: OrderItem) => {
    setEditingItem(item.id);
    setEditFields({ productTypeId: item.product_type_id, designId: item.design_id, sizeId: item.size_id, quantity: item.quantity });
  };

  const saveEdit = async (itemId: number) => {
    setSaving(true);
    const res = await fetch(`/api/orders/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productTypeId: editFields.productTypeId, designId: editFields.designId, sizeId: editFields.sizeId, quantity: editFields.quantity }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingItem(null);
      if (userName) fetchOrders(userName);
    }
  };

  const deleteItem = async (itemId: number) => {
    setConfirmingDelete(null);
    setDeletingItem(itemId);
    const res = await fetch(`/api/orders/items/${itemId}`, { method: "DELETE" });
    setDeletingItem(null);
    if (res.ok && userName) fetchOrders(userName);
  };

  const fetchOrderPayments = async (orderId: string) => {
    const res = await fetch(`/api/payments?orderId=${orderId}`);
    const d = await res.json();
    setPaymentsByOrder(prev => ({ ...prev, [orderId]: d.payments || [] }));
  };

  const submitPayment = async (orderId: string, totalUSD: number, totalCRC: number) => {
    setSubmittingPay(true);
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, userName, amountUsd: totalUSD || null, amountCrc: totalCRC || null, method: payMethod, reference: payRef.trim() || null }),
    });
    setSubmittingPay(false);
    setPayingOrderId(null);
    setPayRef("");
    fetchOrderPayments(orderId);
  };

  // Returns the most relevant payment status for an order
  const getOrderPaymentStatus = (orderId: string): "none" | "pending" | "confirmed" | "rejected" => {
    const pmts = paymentsByOrder[orderId] || [];
    if (pmts.some(p => p.status === "confirmed")) return "confirmed";
    if (pmts.some(p => p.status === "pending")) return "pending";
    if (pmts.length > 0 && pmts.every(p => p.status === "rejected")) return "rejected";
    return "none";
  };

  // Designs filtered by selected product category
  const editableDesigns = editFields.productTypeId
    ? designs.filter(d => {
        try { const arr = JSON.parse(d.designed_for || "[]"); return arr.includes(products.find(p => p.id === editFields.productTypeId) ? (products.find(p => p.id === editFields.productTypeId) as any)?.category : ""); }
        catch { return true; }
      })
    : designs;

  const orderTotalUSD = (order: OrderResult) =>
    order.items.reduce((sum, item) => sum + (getItemPrice(item.product_type_id, item.quantity)?.totalUSD || 0), 0);

  if (!userName) {
    return (
      <PasswordGate password={["thinkmtb-go", "thinkmtb123"]} storageKey="auth-user" title="My Orders" checkOrderingStatus={false}>
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">Please set up your identity first.</p>
          <Link href="/user" className="text-blue-600 underline">Go to Dashboard</Link>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate password={["thinkmtb-go", "thinkmtb123"]} storageKey="auth-user" title="My Orders" checkOrderingStatus={false}>
      <div>
        <div className="mb-8">
          <Link href="/user" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-3">My Orders</h1>
          {userName && <p className="text-gray-400 text-sm mt-1">{userName}</p>}
        </div>

        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
              <p className="text-blue-900 text-lg mb-2">No orders found for {userName}</p>
              <p className="text-blue-700 text-sm mb-4">Items you add will appear here.</p>
              <Link href="/user/order" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Place Your First Order
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const totalUSD = orderTotalUSD(order);
                const canEdit = order.status === "pending";
                const payStatus = getOrderPaymentStatus(order.id);
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    {/* Order header */}
                    <div className="px-6 py-4 flex items-center justify-between bg-gray-50 border-b border-gray-200">
                      <div>
                        <span className="font-bold text-gray-900 text-lg">Order #{order.order_number}</span>
                        <span className="ml-3 text-sm text-gray-500">Started {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {totalUSD > 0 && (
                          <span className="text-sm font-semibold text-gray-700">~${totalUSD.toFixed(2)}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                          {order.status}
                        </span>
                        <button
                          onClick={() => { setPayingOrderId(payingOrderId === order.id ? null : order.id); fetchOrderPayments(order.id); }}
                          disabled={payStatus === "confirmed"}
                          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                            payStatus === "confirmed"
                              ? "bg-green-100 text-green-700 cursor-default"
                              : payStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : payStatus === "rejected"
                              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                              : payingOrderId === order.id
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {payStatus === "confirmed"
                            ? "✓ Paid"
                            : payStatus === "pending"
                            ? (payingOrderId === order.id ? "↑ Close" : "Payment Sent")
                            : payStatus === "rejected"
                            ? "Re-submit"
                            : payingOrderId === order.id
                            ? "↑ Close"
                            : "Pay"}
                        </button>
                      </div>
                    </div>

                    {/* Payment form — expands below header */}
                    {payingOrderId === order.id && (
                      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 space-y-4">
                          {/* Order + club callout */}
                          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold text-blue-900 mb-0.5">
                              When sending payment, include this reference:
                            </p>
                            <p className="text-lg font-bold text-blue-800 tracking-wide font-mono">
                              {order.order_number} — {paySettings.club_name || "ThinkMTB"}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Include the full order number (e.g. <span className="font-semibold">{order.order_number}</span>) in the payment note so we can match it to your order.
                            </p>
                          </div>

                          {/* Payment instructions */}
                          {(paySettings.payment_zelle || paySettings.payment_venmo || paySettings.payment_paypal || paySettings.payment_cash) && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm space-y-1">
                              <p className="font-medium text-gray-700 mb-2">Send payment to:</p>
                              {paySettings.payment_zelle && <p><span className="text-gray-500">Zelle:</span> <span className="font-medium">{paySettings.payment_zelle}</span></p>}
                              {paySettings.payment_venmo && <p><span className="text-gray-500">Venmo:</span> <span className="font-medium">{paySettings.payment_venmo}</span></p>}
                              {paySettings.payment_paypal && <p><span className="text-gray-500">PayPal:</span> <span className="font-medium">{paySettings.payment_paypal}</span></p>}
                              {paySettings.payment_cash && <p><span className="text-gray-500">Cash:</span> <span className="font-medium">{paySettings.payment_cash}</span></p>}
                            </div>
                          )}

                          {/* Previous payments */}
                          {(paymentsByOrder[order.id] || []).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Payments</p>
                              {(paymentsByOrder[order.id] || []).map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{p.method.charAt(0).toUpperCase() + p.method.slice(1)}{p.reference ? ` — ${p.reference}` : ""}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${{ pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" }[p.status as string] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Submit new payment */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Submit Payment Confirmation</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                                  <option value="zelle">Zelle</option>
                                  <option value="venmo">Venmo</option>
                                  <option value="paypal">PayPal</option>
                                  <option value="cash">Cash</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Confirmation / Reference # <span className="text-gray-400">(optional)</span></label>
                                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. 12345678"
                                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                              </div>
                            </div>
                            <button
                              onClick={() => submitPayment(order.id, totalUSD, order.items.reduce((s, i) => s + (getItemPrice(i.product_type_id, i.quantity)?.totalCRC || 0), 0))}
                              disabled={submittingPay}
                              className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
                            >
                              {submittingPay ? "Submitting…" : "Submit Payment Confirmation"}
                            </button>
                          </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => {
                        const price = getItemPrice(item.product_type_id, item.quantity);
                        const isEditing = editingItem === item.id;

                        return (
                          <div key={item.id} className="px-6 py-4">
                            {isEditing ? (
                              // ── Edit row ──────────────────────────────────
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Product</label>
                                    <select value={editFields.productTypeId}
                                      onChange={e => setEditFields(f => ({ ...f, productTypeId: e.target.value, designId: "" }))}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900">
                                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Design</label>
                                    <select value={editFields.designId}
                                      onChange={e => setEditFields(f => ({ ...f, designId: e.target.value }))}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900">
                                      <option value="">— select —</option>
                                      {editableDesigns.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Size</label>
                                    <select value={editFields.sizeId}
                                      onChange={e => setEditFields(f => ({ ...f, sizeId: e.target.value }))}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900">
                                      {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                                    <input type="number" min={1} max={50} value={editFields.quantity}
                                      onChange={e => setEditFields(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(item.id)} disabled={saving || !editFields.designId || !editFields.sizeId}
                                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors">
                                    {saving ? "Saving…" : "Save"}
                                  </button>
                                  <button onClick={() => setEditingItem(null)}
                                    className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // ── Display row ───────────────────────────────
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                                  <span className="text-sm text-gray-500">{item.design_name} · {item.size_name}{(item as any).fit ? ` · ${(item as any).fit}` : ""} · qty {item.quantity}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  {price ? (
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-900">${price.totalUSD.toFixed(2)}</p>
                                      <p className="text-xs text-gray-500">${price.unitUSD.toFixed(2)} each</p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                  {canEdit && (
                                    <div className="flex gap-2">
                                      <button onClick={() => startEdit(item)}
                                        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors">
                                        Edit
                                      </button>
                                      {confirmingDelete === item.id ? (
                                        <div className="flex gap-1 items-center">
                                          <span className="text-xs text-red-700 font-medium">Remove?</span>
                                          <button onClick={() => deleteItem(item.id)} disabled={deletingItem === item.id}
                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40">
                                            {deletingItem === item.id ? "…" : "Yes"}
                                          </button>
                                          <button onClick={() => setConfirmingDelete(null)}
                                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button onClick={() => setConfirmingDelete(item.id)} disabled={deletingItem === item.id}
                                          className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-40">
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Order footer */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div>
                        {canEdit && (
                          <Link href="/user/order" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            + Add more items
                          </Link>
                        )}
                      </div>
                      {totalUSD > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Estimated total</p>
                          <p className="font-bold text-gray-900">${totalUSD.toFixed(2)}</p>
                          {exchangeRate && <p className="text-xs text-gray-400">₡{Math.round(order.items.reduce((s, i) => s + (getItemPrice(i.product_type_id, i.quantity)?.totalCRC || 0), 0)).toLocaleString()}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PasswordGate>
  );
}
