"use client";

import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  example_url: string | null;
  fit_options?: string | null;
  active: number;
  sort_order: number;
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "jersey",
    description: "",
    example_url: "",
    fit_options: ["unisex"] as string[],
    active: true,
    sort_order: 999,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else if (type === "number") {
      setFormData({
        ...formData,
        [name]: parseInt(value),
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
        ? `/api/admin/products/${editingId}`
        : "/api/admin/products";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, fit_options: JSON.stringify(formData.fit_options) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save product");
      }

      setSuccess(
        editingId
          ? "Product updated successfully!"
          : "Product created successfully!"
      );
      setFormData({
        name: "",
        category: "jersey",
        description: "",
        example_url: "",
        fit_options: ["unisex"],
        active: true,
        sort_order: 999,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    let fitOpts = ["unisex"];
    try { fitOpts = JSON.parse((product as any).fit_options || '["unisex"]'); } catch { fitOpts = ["unisex"]; }
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || "",
      example_url: product.example_url || "",
      fit_options: fitOpts,
      active: product.active === 1,
      sort_order: product.sort_order,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }

      setSuccess("Product deleted successfully!");
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting product");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      category: "jersey",
      description: "",
      example_url: "",
      fit_options: ["unisex"],
      active: true,
      sort_order: 999,
    });
  };

  if (loading) return <div className="text-center py-8">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Product Types</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showForm
              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
              : "bg-gray-900 hover:bg-gray-700 text-white"
          }`}
        >
          {showForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Product" : "New Product"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="e.g., LICRA PRO LINE 1.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                >
                  <option value="jersey">Jersey</option>
                  <option value="bib">Bib/Licra</option>
                  <option value="vest">Vest</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  rows={3}
                  placeholder="Describe the product..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Example URL
                </label>
                <input
                  type="url"
                  name="example_url"
                  value={formData.example_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Fit / Gender Options</label>
                <div className="flex gap-4">
                  {(["unisex", "men", "women"] as const).map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.fit_options.includes(opt)}
                        onChange={e => setFormData(f => ({
                          ...f,
                          fit_options: e.target.checked
                            ? [...f.fit_options, opt]
                            : f.fit_options.filter(x => x !== opt)
                        }))}
                        className="rounded" />
                      <span className="text-sm capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Select all that apply. If only one option, users won&apos;t see a fit selector.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Product"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No products yet
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{product.category}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-xs">
                    <span className="line-clamp-2">{product.description}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                      product.active === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                    }`}>{product.active === 1 ? "✓" : "✗"}</span>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-400">
                    {product.sort_order}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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
    </div>
  );
}
