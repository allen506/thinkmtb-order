"use client";

import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
}

interface PricingTier {
  id: number;
  product_type_id: string;
  min_qty: number;
  max_qty: number;
  price_crc: number;
  price_usd: number | null;
}

export default function PricingTierManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    min_qty: 1,
    max_qty: 1,
    price_crc: 0,
    price_usd: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load products
  useEffect(() => {
    fetchProducts();
  }, []);

  // Load tiers when product changes
  useEffect(() => {
    if (selectedProduct) {
      fetchTiers();
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products || []);
      if (data.products.length > 0) {
        setSelectedProduct(data.products[0].id);
      }
    } catch (err) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch(
        `/api/admin/pricing-tiers?productId=${selectedProduct}`
      );
      const data = await res.json();
      setTiers(data.tiers || []);
    } catch (err) {
      setError("Failed to load pricing tiers");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const url = editingId
        ? `/api/admin/pricing-tiers/${editingId}`
        : "/api/admin/pricing-tiers";
      const method = editingId ? "PATCH" : "POST";

      const payload = editingId
        ? formData
        : {
            ...formData,
            product_type_id: selectedProduct,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save pricing tier");
      }

      setSuccess(
        editingId
          ? "Pricing tier updated successfully!"
          : "Pricing tier created successfully!"
      );
      setFormData({
        min_qty: 1,
        max_qty: 1,
        price_crc: 0,
        price_usd: 0,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving pricing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tier: PricingTier) => {
    setFormData({
      min_qty: tier.min_qty,
      max_qty: tier.max_qty,
      price_crc: tier.price_crc,
      price_usd: tier.price_usd || 0,
    });
    setEditingId(tier.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pricing tier?")) return;

    try {
      const res = await fetch(`/api/admin/pricing-tiers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete tier");
      }

      setSuccess("Pricing tier deleted successfully!");
      await fetchTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting tier");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      min_qty: 1,
      max_qty: 1,
      price_crc: 0,
      price_usd: 0,
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Pricing Manager</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showForm ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-gray-900 hover:bg-gray-700 text-white"
          }`}
        >
          {showForm ? "Cancel" : "+ Add Tier"}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Select Product
        </label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">-- Select a product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {showForm && selectedProduct && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Pricing Tier" : "New Pricing Tier"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Quantity *
                </label>
                <input
                  type="number"
                  name="min_qty"
                  value={formData.min_qty}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Quantity *
                </label>
                <input
                  type="number"
                  name="max_qty"
                  value={formData.max_qty}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Price CRC (₡) *
                </label>
                <input
                  type="number"
                  name="price_crc"
                  value={formData.price_crc}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Price USD ($)
                </label>
                <input
                  type="number"
                  name="price_usd"
                  value={formData.price_usd}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - auto-calculated if left blank
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
          className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving..." : "Save Tier"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedProduct && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Qty</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Qty</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Price CRC</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Price USD</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    No pricing tiers for this product
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => (
                  <tr key={tier.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-900">{tier.min_qty}</td>
                    <td className="px-5 py-3 text-gray-900">{tier.max_qty}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      ₡{tier.price_crc.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      ${tier.price_usd?.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tier)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tier.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
