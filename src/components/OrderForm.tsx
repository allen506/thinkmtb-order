"use client";

import { useState, useEffect, useCallback } from "react";
import DesignSelector from "@/components/DesignSelector";
import ProductSelector from "@/components/ProductSelector";
import PricingTable from "@/components/PricingTable";
import { Design, ProductType, Size } from "@/lib/types";
import { PRICING, getUnitPrice } from "@/lib/pricing";

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

const PRODUCT_URLS: Record<string, string> = {
  "wind-vest": "https://www.cmssportswear.com/hombres-corta-vientos-chalecos",
  "pro-jersey": "https://www.cmssportswear.com/jersey-pro-personalizado",
  "enduro-jersey": "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado",
};

interface OrderItem {
  id: string;
  productTypeId: string;
  designId: string;
  sizeId: string;
  quantity: number;
}

export default function OrderForm({ onOrderPlaced }: { onOrderPlaced?: () => void }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  // Reset form to initial state
  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setItems([
      {
        id: generateId(),
        productTypeId: "",
        designId: "",
        sizeId: "",
        quantity: 1,
      },
    ]);
    setShowErrors(false);
    setError("");
    setSuccess(false);
  };

  // Team-wide quantities per product (for pricing tier calculation)
  const [teamQty, setTeamQty] = useState<Record<string, number>>({});

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: generateId(),
      productTypeId: "",
      designId: "",
      sizeId: "",
      quantity: 1,
    },
  ]);

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        setDesigns(data.designs || []);
        setProductTypes(data.productTypes || []);
        setSizes(data.sizes || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load catalog data");
        setLoading(false);
      });
    // Fetch team-wide quantities for pricing
    fetch("/api/orders/team-quantities")
      .then((res) => res.json())
      .then((data) => setTeamQty(data || {}))
      .catch(() => {});
  }, []);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        productTypeId: items[0]?.productTypeId || "",
        designId: items[0]?.designId || "",
        sizeId: "",
        quantity: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const setDesignForAll = useCallback((designId: string) => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, designId }))
    );
  }, []);

  const setProductForAll = useCallback((productTypeId: string) => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, productTypeId }))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    // Validate all steps
    const nameOk = !!firstName.trim() && !!lastName.trim();
    const designOk = !!items[0]?.designId;
    const productOk = !!items[0]?.productTypeId;
    const detailsOk = items.every(
      (item) => item.productTypeId && item.designId && item.sizeId && item.quantity > 0
    );
    if (!nameOk || !designOk || !productOk || !detailsOk) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: `${firstName} ${lastName}`.trim(),
          items: items.map((item) => ({
            productTypeId: item.productTypeId,
            designId: item.designId,
            sizeId: item.sizeId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place order");
      }

      setSuccess(true);
      setShowErrors(false);
      // Reset form
      setItems([
        {
          id: generateId(),
          productTypeId: "",
          designId: "",
          sizeId: "",
          quantity: 1,
        },
      ]);
      onOrderPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Order Placed Successfully!
        </h2>
        <p className="text-gray-600 mb-8">
          Thank you, {firstName}! Your ThinkMTB order has been received. We&apos;ll
          confirm details and pricing once all team orders are in.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Place Another Order
        </button>
      </div>
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const allItemsValid = items.every(
    (item) =>
      item.productTypeId && item.designId && item.sizeId && item.quantity > 0
  );

  // Per-step validation
  const step1Complete = !!firstName.trim() && !!lastName.trim();
  const step2Complete = !!items[0]?.designId;
  const step3Complete = !!items[0]?.productTypeId;
  const step4Complete = allItemsValid && items.every(i => i.sizeId);

  // Calculate per-item prices based on team volume + user's own items
  const getItemPrice = (productTypeId: string, qty: number) => {
    if (!productTypeId) return null;
    // Total = existing team orders + all items in this form for the same product
    const formQtyForProduct = items
      .filter((i) => i.productTypeId === productTypeId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalTeamQty = (teamQty[productTypeId] || 0) + formQtyForProduct;
    const unitPrice = getUnitPrice(productTypeId, totalTeamQty);
    if (!unitPrice) return null;
    return {
      unitUSD: unitPrice.priceUSD,
      unitCRC: unitPrice.priceCRC,
      totalUSD: unitPrice.priceUSD * qty,
      totalCRC: unitPrice.priceCRC * qty,
      teamTotal: totalTeamQty,
    };
  };

  // Grand total for this order
  const orderTotalUSD = items.reduce((sum, item) => {
    const price = getItemPrice(item.productTypeId, item.quantity);
    return sum + (price?.totalUSD || 0);
  }, 0);
  const orderTotalCRC = items.reduce((sum, item) => {
    const price = getItemPrice(item.productTypeId, item.quantity);
    return sum + (price?.totalCRC || 0);
  }, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1 — Your Name */}
        <div className={`bg-white rounded-xl shadow-sm border p-6 transition-colors ${
          showErrors && !step1Complete ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"
        }`}>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Step 1 — Your Name
            {showErrors && !step1Complete && (
              <span className="text-red-500 text-sm font-normal ml-2">— Please enter your name</span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-black mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-black mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Last name"
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Design Selection */}
        <div className={`bg-white rounded-xl shadow-sm border p-6 transition-colors ${
          showErrors && !step2Complete ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"
        }`}>
          {showErrors && !step2Complete && (
            <p className="text-red-500 text-sm mb-2">Please select a design</p>
          )}
          <DesignSelector
            designs={designs}
            selectedDesignId={items[0]?.designId || ""}
            onSelect={setDesignForAll}
          />
        </div>

        {/* Step 3 — Product Selection */}
        <div className={`bg-white rounded-xl shadow-sm border p-6 transition-colors ${
          showErrors && !step3Complete ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"
        }`}>
          {showErrors && !step3Complete && (
            <p className="text-red-500 text-sm mb-2">Please select a product</p>
          )}
          <ProductSelector
            productTypes={productTypes}
            selectedProductId={items[0]?.productTypeId || ""}
            onSelect={setProductForAll}
          />
        </div>

        {/* Step 4 — Order Details */}
        <div className={`bg-white rounded-xl shadow-sm border p-6 transition-colors ${
          showErrors && !step4Complete ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Step 4 — Order Details
              {showErrors && !step4Complete && (
                <span className="text-red-500 text-sm font-normal ml-2">— Please complete all fields</span>
              )}
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Another Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">
                    Item {index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Product Type
                    </label>
                    <select
                      value={item.productTypeId}
                      onChange={(e) =>
                        updateItem(item.id, "productTypeId", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Select product...</option>
                      {productTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Design
                    </label>
                    <select
                      value={item.designId}
                      onChange={(e) =>
                        updateItem(item.id, "designId", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Select design...</option>
                      {designs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Size
                    </label>
                    <select
                      value={item.sizeId}
                      onChange={(e) =>
                        updateItem(item.id, "sizeId", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Select size...</option>
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Per-item price */}
                {item.productTypeId && (() => {
                  const price = getItemPrice(item.productTypeId, item.quantity);
                  if (!price) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1">
                      <span className="text-gray-500 text-xs sm:text-sm">
                        ${price.unitUSD.toFixed(2)} × {item.quantity} · Based on {price.teamTotal} total team units
                      </span>
                      <span className="font-semibold text-gray-800">
                        ${price.totalUSD.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-blue-800">
                <strong>Total items:</strong> {totalItems}
                {" · "}
                <span className="text-blue-600">
                  Pricing based on total team order quantity
                </span>
              </p>
              {orderTotalUSD > 0 && (
                <div className="text-left sm:text-right">
                  <p className="text-xs text-gray-500">Estimated Order Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${orderTotalUSD.toFixed(2)}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      (₡{orderTotalCRC.toLocaleString()})
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            onClick={() => setShowErrors(true)}
            className={`px-12 py-4 rounded-xl transition-colors font-bold text-xl shadow-lg hover:shadow-xl ${
              !step1Complete || !step2Complete || !step3Complete || !step4Complete
                ? "bg-blue-400 text-white hover:bg-blue-500"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            {submitting ? "Placing Order..." : "✓ Place Order"}
          </button>
          {showErrors && (!step1Complete || !step2Complete || !step3Complete || !step4Complete) && (
            <p className="text-red-500 text-sm">Please complete all highlighted steps above before placing your order.</p>
          )}
          <button
            type="button"
            onClick={clearForm}
            className="mt-2 px-8 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-black font-medium text-lg border border-gray-300 transition-colors"
          >
            Clear Form
          </button>
        </div>

        {/* Pricing Reference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Pricing Reference
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Prices depend on total team quantity per product type. The more
            riders that order, the better the price!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {productTypes.map((pt) => (
              <PricingTable
                key={pt.id}
                productTypeId={pt.id}
                productName={pt.name}
                productUrl={PRODUCT_URLS[pt.id]}
                tiers={PRICING[pt.id] || []}
              />
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
