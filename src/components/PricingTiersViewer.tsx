"use client";

import { useEffect, useState } from "react";
import PricingTable from "./PricingTable";

interface Product {
  id: string;
  name: string;
  active: number;
}

interface PricingTier {
  id: number;
  product_type_id: string;
  min_qty: number;
  max_qty: number;
  price_crc: number;
  price_usd: number;
}

interface ProductSummary {
  product_type_id: string;
  product_name: string;
  total_qty: number;
}

interface PricingTiersViewerProps {
  summary: {
    byProduct: ProductSummary[];
  };
  exchangeRate?: number;
}

export default function PricingTiersViewer({
  summary,
  exchangeRate,
}: PricingTiersViewerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingByProduct, setPricingByProduct] = useState<
    Record<string, PricingTier[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch all products
        const productsRes = await fetch("/api/admin/products");
        if (!productsRes.ok) throw new Error("Failed to fetch products");
        const productsData = await productsRes.json();
        const activeProducts = productsData.products.filter(
          (p: Product) => p.active === 1
        );
        setProducts(activeProducts);

        // Fetch pricing tiers for each product
        const pricingMap: Record<string, PricingTier[]> = {};
        for (const product of activeProducts) {
          const tiersRes = await fetch(
            `/api/admin/pricing-tiers?productId=${encodeURIComponent(
              product.id
            )}`
          );
          if (tiersRes.ok) {
            const tiersData = await tiersRes.json();
            pricingMap[product.id] = tiersData.tiers || [];
          }
        }
        setPricingByProduct(pricingMap);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load pricing data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading pricing tiers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-black">
          Current pricing tiers. The highlighted tier shows the current price
          based on total team order quantity.
        </p>
        {exchangeRate && (
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 whitespace-nowrap inline-flex items-center gap-1">
            💱 <strong>₡{exchangeRate.toFixed(2)} / $1 USD</strong>
            <span className="text-blue-500 ml-1">(BCCR compra)</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => {
          const tiers = pricingByProduct[product.id] || [];
          const productQty =
            summary.byProduct.find(
              (p) => p.product_type_id === product.id
            )?.total_qty || 0;
          const productName =
            summary.byProduct.find(
              (p) => p.product_type_id === product.id
            )?.product_name || product.name;

          // Convert API tiers to PricingTable format
          const formattedTiers = tiers.map((tier) => ({
            minQty: tier.min_qty,
            maxQty: tier.max_qty,
            priceCRC: tier.price_crc,
          }));

          return (
            <div key={product.id}>
              <PricingTable
                productTypeId={product.id}
                productName={productName}
                tiers={formattedTiers}
                currentTotalQty={productQty}
                exchangeRate={exchangeRate}
              />
              <p className="text-xs text-black mt-2 text-center">
                Current total: <strong>{productQty}</strong> units
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
