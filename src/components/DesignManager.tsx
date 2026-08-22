"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Design {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  active: number;
  sort_order: number;
  designed_for: string | null;
}

interface ProductType {
  id: string;
  name: string;
  category: string;
}

export default function DesignManager() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
    sort_order: 999,
    designed_for: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load designs and product types
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [designsRes, productsRes] = await Promise.all([
        fetch("/api/admin/designs"),
        fetch("/api/admin/products"),
      ]);
      const designsData = await designsRes.json();
      const productsData = await productsRes.json();

      setDesigns(designsData.designs || []);
      setProductTypes(productsData.products || []);

      // Extract unique categories
      const uniqueCategories = new Set<string>(
        (productsData.products || []).map((p: ProductType) => p.category)
      );
      setCategories(uniqueCategories);
    } catch (err) {
      setError("Failed to load data");
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
    if (type === "checkbox" && name.startsWith("category-")) {
      const category = name.replace("category-", "");
      const newDesignedFor = (e.target as HTMLInputElement).checked
        ? [...formData.designed_for, category]
        : formData.designed_for.filter((c) => c !== category);
      setFormData({
        ...formData,
        designed_for: newDesignedFor,
      });
    } else if (name === "active") {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const url = editingId
        ? `/api/admin/designs/${editingId}`
        : "/api/admin/designs";
      const method = editingId ? "PATCH" : "POST";

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("active", formData.active.toString());
      formDataToSend.append("sort_order", formData.sort_order.toString());
      formDataToSend.append("designed_for", JSON.stringify(formData.designed_for));

      if (file) {
        formDataToSend.append("file", file);
      }

      const res = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save design");
      }

      setSuccess(
        editingId
          ? "Design updated successfully!"
          : "Design created successfully!"
      );
      setFormData({
        name: "",
        description: "",
        active: true,
        sort_order: 999,
        designed_for: [],
      });
      setFile(null);
      setPreviewUrl("");
      setEditingId(null);
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving design");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (design: Design) => {
    setFormData({
      name: design.name,
      description: design.description || "",
      active: design.active === 1,
      sort_order: design.sort_order,
      designed_for: design.designed_for ? JSON.parse(design.designed_for) : [],
    });
    if (design.image_url) {
      setPreviewUrl(design.image_url);
    }
    setEditingId(design.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this design?")) return;

    try {
      const res = await fetch(`/api/admin/designs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete design");
      }

      setSuccess("Design deleted successfully!");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting design");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      active: true,
      sort_order: 999,
      designed_for: [],
    });
    setFile(null);
    setPreviewUrl("");
  };

  if (loading) return <div className="text-center py-8">Loading designs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Designs Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancel" : "+ Add New Design"}
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
            {editingId ? "Edit Design" : "New Design"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Design Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="e.g., Traditional Black"
                />
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
                  placeholder="Describe the design..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Design Image
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB. JPEG, PNG, WebP, GIF
                    </p>
                  </div>
                  {previewUrl && (
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-3">
                  Design For (Product Types) *
                </label>
                <div className="space-y-2">
                  {Array.from(categories).map((category) => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`category-${category}`}
                        checked={formData.designed_for.includes(category)}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
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
                {submitting ? "Saving..." : "Save Design"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {designs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No designs yet</div>
      ) : (
        (() => {
          const CAT_LABELS: Record<string, string> = { jersey: "Jerseys", "enduro-short": "Enduro Short Sleeve", "enduro-long": "Enduro Long Sleeve", bib: "Bibs", vest: "Vests" };
          const CAT_ICONS: Record<string, string> = { jersey: "🚴", "enduro-short": "👕", "enduro-long": "🏔️", bib: "🩱", vest: "🧥" };
          const CAT_ORDER = ["jersey", "enduro-short", "enduro-long", "bib", "vest"];
          const grouped: Record<string, Design[]> = {};
          for (const d of designs) {
            let cats: string[] = [];
            try { cats = JSON.parse(d.designed_for || "[]"); } catch { cats = []; }
            const primary = cats[0] || "other";
            if (!grouped[primary]) grouped[primary] = [];
            grouped[primary].push(d);
          }
          const groupedCats = [...CAT_ORDER.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c)).sort()];
          return (
            <div className="space-y-8">
              {groupedCats.map(cat => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm">{CAT_ICONS[cat] || "🖼️"}</span>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {CAT_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[cat].map((design) => (
                      <div key={design.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white">
                        {design.image_url && (
                          <div className="relative w-full h-48 bg-gray-50">
                            <img src={design.image_url} alt={design.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900">{design.name}</h3>
                          {design.description && (
                            <p className="text-sm text-gray-500 mt-1">{design.description}</p>
                          )}
                          {design.designed_for && (
                            <p className="text-xs text-blue-600 mt-2">
                              For: {JSON.parse(design.designed_for || "[]").map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                            <span>{design.active === 1 ? "✓ Active" : "✗ Inactive"}</span>
                            <span>Order: {design.sort_order}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleEdit(design)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Edit</button>
                            <button onClick={() => handleDelete(design.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
