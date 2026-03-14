
"use client";
import { useState, useEffect, useCallback } from "react";
import PasswordGate from "../../components/PasswordGate";

const statusColors: { [key: string]: string } = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

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
  }, [fetchOrders]);

  // ...existing code for edit, delete, and UI logic...

  return (
    <PasswordGate password="thinkmtb-go" storageKey="auth-main" title="My Orders">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
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
                            // ...existing code for item editing and deletion...
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
                                      /* startEdit(item) */
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    title="Edit this item"
                                  >
                                    ✎ Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      /* deleteItem(item.id) */
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
                            onClick={() => {/* deleteOrder(order.id) */}}
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
      )}
    </PasswordGate>
  );
}
