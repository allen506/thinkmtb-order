"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PricingTier {
  min_qty: number;
  max_qty: number;
  price_crc: number;
  price_usd: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sort_order: number;
  hasOverride: boolean;
  overridePrice?: {
    priceCrc: number;
    priceUsd: number;
  };
  pricing: PricingTier[];
}

interface SelectedItem {
  productId: string;
  quantity: number;
  priceCrc: number;
  priceUsd: number;
}

interface ProductSelectionFormProps {
  teamName: string;
  designRequestId?: string;
  onSuccess?: (orderId: string) => void;
}

export default function ProductSelectionForm({
  teamName,
  designRequestId,
  onSuccess,
}: ProductSelectionFormProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [exchangeRate, setExchangeRate] = useState(500); // Default CRC/USD

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsRes = await fetch("/api/team/products", {
          headers: {
            "x-tenant-slug": teamName.toLowerCase(),
          },
        });

        if (!productsRes.ok) {
          throw new Error("Failed to load products");
        }

        const productsData = await productsRes.json();
        setProducts(productsData.products || []);

        // Fetch exchange rate
        try {
          const rateRes = await fetch("/api/exchange-rate");
          if (rateRes.ok) {
            const rateData = await rateRes.json();
            setExchangeRate(rateData.rate || 500);
          }
        } catch (e) {
          // Use default if exchange rate API fails
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamName]);

  const updateQuantity = async (
    productId: string,
    quantity: number
  ) => {
    if (quantity < 1) {
      // Remove item
      setSelectedItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      return;
    }

    try {
      const response = await fetch("/api/team/products/calculate-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": teamName.toLowerCase(),
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }

      const data = await response.json();

      setSelectedItems((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  priceCrc: data.priceCrc,
                  priceUsd: data.priceUsd,
                }
              : item
          );
        } else {
          return [
            ...prev,
            {
              productId,
              quantity,
              priceCrc: data.priceCrc,
              priceUsd: data.priceUsd,
            },
          ];
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Price calculation failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      setError("Please select at least one product");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/create-with-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": teamName.toLowerCase(),
        },
        body: JSON.stringify({
          items: selectedItems,
          designRequestId: designRequestId || null,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const data = await response.json();

      setSuccess(
        "Order created successfully! Proceed to payment to complete your order."
      );

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data.orderId);
        } else {
          router.push(`/custom/${teamName}/order/payment/${data.orderId}`);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce(
      (sum, item) => ({
        crc: sum.crc + item.priceCrc * item.quantity,
        usd: sum.usd + item.priceUsd * item.quantity,
      }),
      { crc: 0, usd: 0 }
    );
  };

  const total = calculateTotal();

  const getPricingDisplay = (product: Product) => {
    if (product.hasOverride && product.overridePrice) {
      return (
        <div className="text-sm">
          <p className="font-semibold text-green-600">
            Special Price: ${product.overridePrice.priceUsd.toFixed(2)} USD
          </p>
          <p className="text-gray-600">
            ₡{product.overridePrice.priceCrc.toLocaleString()} CRC
          </p>
        </div>
      );
    }

    if (product.pricing.length > 0) {
      return (
        <div className="text-sm">
          <p className="font-semibold text-gray-700 mb-2">Pricing Tiers:</p>
          {product.pricing.map((tier, idx) => (
            <p key={idx} className="text-gray-600">
              {tier.min_qty}-{tier.max_qty || "+"}: ${tier.price_usd.toFixed(2)}{" "}
              / ₡{tier.price_crc.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }

    return <p className="text-red-600">No pricing available</p>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          No products available for your team yet. Please contact your
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Select Products
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {products.map((product) => {
              const selectedItem = selectedItems.find(
                (item) => item.productId === product.id
              );
              const quantity = selectedItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {product.description}
                  </p>

                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    {getPricingDisplay(product)}
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">
                        Quantity:
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) =>
                          updateQuantity(product.id, parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </label>

                    {quantity > 0 && selectedItem && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Unit Price:</span> $
                          {selectedItem.priceUsd.toFixed(2)}
                        </p>
                        <p className="text-sm text-blue-900 mt-1">
                          <span className="font-semibold">Subtotal:</span> $
                          {(selectedItem.priceUsd * quantity).toFixed(2)} USD
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          ₡{(selectedItem.priceCrc * quantity).toLocaleString()} CRC
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              Additional Notes (Optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or notes for this order..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Order Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Items Selected:</span>
                <span className="font-semibold text-gray-900">
                  {selectedItems.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Quantity:</span>
                <span className="font-semibold text-gray-900">
                  {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-blue-600">
                    ${total.usd.toFixed(2)} USD
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  ₡{total.crc.toLocaleString()} CRC (at ${exchangeRate}/USD)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || selectedItems.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {isSubmitting
            ? "Creating Order..."
            : `Continue to Payment (${selectedItems.length > 0 ? `$${total.usd.toFixed(2)}` : "Select items"})`}
        </button>
      </form>
    </div>
  );
}
