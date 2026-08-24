"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PasswordGate from "@/components/PasswordGate";

interface PricingTier {
  id: string;
  product_type_id: string;
  min_qty: number;
  max_qty: number | null;
  price_crc: number;
  price_usd: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
}

interface CatalogData {
  productTypes: Product[];
  pricingTiers: PricingTier[];
  exchangeRate: number;
}

export default function UserPricingPage() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [teamQty, setTeamQty] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCatalog();
    fetchTeamQuantities();
  }, []);

  const fetchTeamQuantities = () => {
    fetch("/api/orders/team-quantities")
      .then((res) => res.json())
      .then((data) => setTeamQty(data || {}))
      .catch(() => {});
  };

  const fetchCatalog = () => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        setCatalog(data);
        if (data.productTypes.length > 0) {
          setSelectedProduct(data.productTypes[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const getProductTiers = () => {
    if (!catalog || !selectedProduct) return [];
    return catalog.pricingTiers
      .filter((t) => t.product_type_id === selectedProduct)
      .sort((a, b) => a.min_qty - b.min_qty);
  };

  const selectedProductData = catalog?.productTypes?.find((p) => p.id === selectedProduct);

  return (
    <PasswordGate password={["thinkmtb-go", "thinkmtb123"]} storageKey="auth-user" title="Pricing" checkOrderingStatus={false}>
      <div>
        <div className="mb-8">
          <Link href="/user" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-3">Pricing</h1>
          <p className="text-gray-400 text-sm mt-1">Prices are based on team quantity and updated in real-time</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
          ) : !catalog || !catalog.productTypes || catalog.productTypes.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-900">No products available</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Product Selector — grouped by category */}
            {(() => {
              const CATEGORY_LABELS: Record<string, string> = { jersey: "Jerseys", "enduro-short": "Enduro Short Sleeve", "enduro-long": "Enduro Long Sleeve", bib: "Bibs", vest: "Vests", gloves: "Gloves", shorts: "Shorts", socks: "Socks" };
              const CATEGORY_ICONS: Record<string, string> = { jersey: "🚴", "enduro-short": "👕", "enduro-long": "🏔️", bib: "🩱", vest: "🧥", gloves: "🧤", shorts: "🩳", socks: "🧦" };
              const grouped = catalog.productTypes.reduce<Record<string, typeof catalog.productTypes>>((acc, p) => {
                const cat = (p as any).category || "other";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(p);
                return acc;
              }, {});
              const catOrder = ["jersey", "enduro-short", "enduro-long", "bib", "vest"];
              const categories = [...catOrder.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !catOrder.includes(c)).sort()];
              return (
                <div className="space-y-5">
                  {categories.map(cat => (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{CATEGORY_ICONS[cat] || "📦"}</span>
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider">
                          {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </h4>
                        <div className="flex-1 h-px bg-gray-300" />
                      </div>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {grouped[cat].map((product) => (
                          <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedProduct === product.id
                                ? "border-amber-600 bg-amber-50"
                                : "border-gray-200 bg-white hover:border-amber-400"
                            }`}
                          >
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                            {(product as any).example_url && (
                              <a
                                href={(product as any).example_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View on CMS Sportswear ↗
                              </a>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Pricing Table */}
            {selectedProductData && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {selectedProductData.name}
                      </h2>
                      <p className="text-amber-100 text-sm mt-1">
                        {selectedProductData.description}
                      </p>
                    </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-right">
                      <p className="text-amber-100 text-xs font-semibold">ORDERS IN QUEUE</p>
                      <p className="text-white text-2xl font-bold">{selectedProduct ? (teamQty[selectedProduct] || 0) : 0}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Price (CRC)</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Price (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getProductTiers().length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            No pricing available for this product
                          </td>
                        </tr>
                      ) : (
                        getProductTiers().map((tier, idx) => {
                          const currentQty = selectedProduct ? (teamQty[selectedProduct] || 0) : 0;
                          const isCurrentTier = currentQty >= tier.min_qty && currentQty <= (tier.max_qty || Number.MAX_SAFE_INTEGER);
                          return (
                            <tr key={tier.id} className={`${
                              isCurrentTier 
                                ? "bg-amber-50 border-l-4 border-l-amber-600" 
                                : idx % 2 === 0 
                                  ? "bg-white" 
                                  : "bg-gray-50"
                            }`}>
                              <td className={`px-6 py-3 font-medium ${isCurrentTier ? "text-amber-900" : "text-gray-900"}`}>
                                <div className="flex items-center gap-2">
                                  {tier.min_qty} - {tier.max_qty ? tier.max_qty : "∞"}
                                  {isCurrentTier && (
                                    <span className="inline-flex items-center gap-1 bg-amber-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                                      ✓ CURRENT
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`px-6 py-3 text-right font-medium ${isCurrentTier ? "text-amber-900 font-bold text-lg" : "text-gray-900"}`}>
                                ₡{tier.price_crc.toLocaleString("es-CR")}
                              </td>
                              <td className={`px-6 py-3 text-right font-bold ${isCurrentTier ? "text-amber-700 text-lg" : "text-green-700"}`}>
                                ${tier.price_usd.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {catalog.exchangeRate && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Exchange rate:{" "}
                      <span className="font-semibold text-gray-700">1 USD = ₡{catalog.exchangeRate.toLocaleString("es-CR", { maximumFractionDigits: 2 })}</span>
                      {" · "}Source:{" "}
                      <a
                        href="https://tipodecambio.paginasweb.cr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        BCCR via tipodecambio.paginasweb.cr
                      </a>
                      {" · "}Updated in real-time
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-blue-900 text-sm">
                <strong>💡 Note:</strong> Prices update automatically based on current team quantity. The more people order a product, the lower the per-unit cost becomes!
              </p>
            </div>
          </div>
        )}
      </div>
    </PasswordGate>
  );
}
