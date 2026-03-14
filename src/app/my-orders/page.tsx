"use client";

import { useState, useEffect, useCallback } from "react";

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
  user_name: string;
  status: string;
  notes: string;
  created_at: string;
  items: OrderItem[];
}

interface CatalogOption {
  id: string;
  name: string;
}

interface EditState {
  productTypeId: string;
  designId: string;
  sizeId: string;
  quantity: number;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Catalog data for edit dropdowns
  const [productTypes, setProductTypes] = useState<CatalogOption[]>([]);
  const [designs, setDesigns] = useState<CatalogOption[]>([]);
  const [sizes, setSizes] = useState<CatalogOption[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Load catalog for edit dropdowns
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        setProductTypes(data.productTypes || []);
        setDesigns(data.designs || []);
        setSizes(data.sizes || []);
      })
      .catch(() => {});
  }, [fetchOrders]);

  const startEdit = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditState({
      productTypeId: item.product_type_id,
      designId: item.design_id,
      sizeId: item.size_id,
      quantity: item.quantity,
    });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditState(null);
  };

  const saveEdit = async (itemId: number) => {
    if (!editState) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTypeId: editState.productTypeId,
          designId: editState.designId,
          sizeId: editState.sizeId,
          quantity: editState.quantity,
        }),
      });
      if (res.ok) {
        setEditingItemId(null);
        setEditState(null);
        await fetchOrders();
      } else {
        alert("Failed to save changes.");
      }
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!confirm("Remove this item from your order?")) return;
    setDeleting(itemId);
    try {
      const res = await fetch(`/api/orders/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchOrders();
      }
    } catch {
      alert("Failed to remove item. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Remove this entire order? This cannot be undone.")) return;
    setDeleting(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setExpandedId(null);
        await fetchOrders();
      }
    } catch {
      alert("Failed to remove order. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    paid: "bg-blue-100 text-blue-800",
    ordered: "bg-purple-100 text-purple-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">My Orders</h1>
        <button
          onClick={fetchOrders}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-black font-medium">No orders placed yet.</p>
          <p className="text-black text-sm mt-1">
            Orders placed on the main page will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Clickable header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                    <div>
                      <p className="font-semibold text-black">
                        {order.user_name}
                      </p>
                      <p className="text-sm text-black">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {" · "}
                        {totalQty} item{totalQty !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      statusColors[order.status] || "bg-gray-100 text-black"
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => {
                        const isEditing = editingItemId === item.id;

                        if (isEditing && editState) {
                          return (
                            <div key={item.id} className="px-4 sm:px-6 py-3 bg-blue-50">
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-semibold text-black mb-1">Product</label>
                                  <select
                                    value={editState.productTypeId}
                                    onChange={(e) => setEditState({ ...editState, productTypeId: e.target.value })}
                                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-black bg-white"
                                  >
                                    {productTypes.map((pt) => (
                                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-black mb-1">Design</label>
                                  <select
                                    value={editState.designId}
                                    onChange={(e) => setEditState({ ...editState, designId: e.target.value })}
                                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-black bg-white"
                                  >
                                    {designs.map((d) => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-black mb-1">Size</label>
                                  <select
                                    value={editState.sizeId}
                                    onChange={(e) => setEditState({ ...editState, sizeId: e.target.value })}
                                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-black bg-white"
                                  >
                                    {sizes.map((s) => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-black mb-1">Qty</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={editState.quantity}
                                    onChange={(e) => setEditState({ ...editState, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-black bg-white"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEdit}
                                  className="text-sm text-black hover:bg-gray-200 px-3 py-1.5 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(item.id)}
                                  disabled={saving}
                                  className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-50"
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between group gap-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 flex-1 text-sm text-black">
                              <span>{item.product_name}</span>
                              <span>{item.design_name}</span>
                              <span>{item.size_name}</span>
                              <span className="font-medium">Qty: {item.quantity}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:ml-4 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(item);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title="Edit this item"
                              >
                                ✎ Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteItem(item.id);
                                }}
                                disabled={deleting === item.id}
                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                title="Remove this item"
                              >
                                {deleting === item.id ? "..." : "✕ Remove"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delete entire order */}
                    <div className="px-4 sm:px-6 py-3 bg-gray-50 flex justify-end">
                      <button
                        onClick={() => deleteOrder(order.id)}
                        disabled={deleting === order.id}
                        className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
                      >
                        {deleting === order.id ? "Removing..." : "🗑 Remove Entire Order"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
