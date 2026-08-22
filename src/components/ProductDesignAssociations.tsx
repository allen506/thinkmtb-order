"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  active: number;
}

interface Design {
  id: string;
  name: string;
  image_url?: string;
  active?: number;
  designed_for?: string;
}

interface ProductDesignAssociation {
  id: number;
  product_type_id: string;
  design_id: string;
  design_name: string;
  sort_order: number;
  active: number;
}

export default function ProductDesignAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [associations, setAssociations] = useState<ProductDesignAssociation[]>(
    []
  );
  const [selectedDesignId, setSelectedDesignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch products and designs on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, designsRes] = await Promise.all([
          fetch("/api/admin/products"),
          fetch("/api/admin/designs"),
        ]);

        if (!productsRes.ok || !designsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const productsData = await productsRes.json();
        const designsData = await designsRes.json();

        setProducts(productsData.products || []);
        setDesigns(designsData.designs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    };

    fetchData();
  }, []);

  // Fetch associations for selected product
  useEffect(() => {
    if (!selectedProductId) {
      setAssociations([]);
      return;
    }

    const fetchAssociations = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin/product-designs?productId=${encodeURIComponent(
            selectedProductId
          )}`
        );
        if (!res.ok) throw new Error("Failed to fetch associations");
        const data = await res.json();
        setAssociations(data.associations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load associations");
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, [selectedProductId]);

  // Add association
  const handleAddAssociation = async () => {
    if (!selectedProductId || !selectedDesignId) {
      setError("Please select both product and design");
      return;
    }

    // Check if already associated
    if (
      associations.some((a) => a.design_id === selectedDesignId)
    ) {
      setError("This design is already associated with this product");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/admin/product-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type_id: selectedProductId,
          design_id: selectedDesignId,
          sort_order: associations.length,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create association");
      }

      // Refresh associations
      const associationsRes = await fetch(
        `/api/admin/product-designs?productId=${encodeURIComponent(
          selectedProductId
        )}`
      );
      const associationsData = await associationsRes.json();
      setAssociations(associationsData.associations || []);

      setSelectedDesignId("");
      setSuccess("Design associated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add association");
    } finally {
      setLoading(false);
    }
  };

  // Remove association
  const handleRemoveAssociation = async (associationId: number) => {
    if (!confirm("Remove this design from the product?")) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `/api/admin/product-designs/${associationId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete association");

      setAssociations(
        associations.filter((a) => a.id !== associationId)
      );
      setSuccess("Design removed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove association");
    } finally {
      setLoading(false);
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);
  const availableDesigns = designs.filter((d) => {
    // Exclude designs already associated with this product
    if (associations.some((a) => a.design_id === d.id)) {
      return false;
    }

    // If product is selected, ONLY show designs tagged for its category
    if (currentProduct) {
      if (!d.designed_for) {
        return false; // No category tagged, skip it
      }
      try {
        const designedFor = JSON.parse(d.designed_for);
        return Array.isArray(designedFor) && designedFor.includes(currentProduct.category);
      } catch {
        return false;
      }
    }

    // If no product selected, show all unassociated designs
    return true;
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-3">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">-- Select a product --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProductId && (
        <div className="space-y-6">
          {/* Add Association */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Add Design to {currentProduct?.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Designs
                </label>
                <select
                  value={selectedDesignId}
                  onChange={(e) => setSelectedDesignId(e.target.value)}
                  disabled={availableDesigns.length === 0}
                  className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                >
                  <option value="">
                    {availableDesigns.length === 0
                      ? "All designs already associated"
                      : "-- Select a design --"}
                  </option>
                  {availableDesigns.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddAssociation}
                disabled={
                  loading ||
                  !selectedDesignId ||
                  availableDesigns.length === 0
                }
                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Adding..." : "Add Design"}
              </button>
            </div>
          </div>

          {/* Associated Designs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">
              Designs for {currentProduct?.name}
            </h3>
            {associations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No designs associated yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Design Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {associations.map((assoc) => (
                      <tr
                        key={assoc.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {assoc.design_name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              assoc.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {assoc.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveAssociation(assoc.id)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
