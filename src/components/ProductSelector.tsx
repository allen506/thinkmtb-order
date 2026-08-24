"use client";

import { useState } from "react";
import { ProductType } from "@/lib/types";

const PRODUCT_ICONS: Record<string, string> = {
  "pro-jersey": "🚴",
  "enduro-jersey": "🏔️",
  "enduro-short": "👕",
  "wind-vest": "🧥",
};

const PRODUCT_TAGLINES: Record<string, string> = {
  "pro-jersey": "High-performance cycling jersey",
  "enduro-jersey": "Long sleeve MTB jersey",
  "enduro-short": "Short sleeve dry fit jersey",
  "wind-vest": "Lightweight windbreaker vest",
};

const CATEGORY_LABELS: Record<string, string> = {
  jersey: "Jerseys",
  "enduro-short": "Enduro Short Sleeve",
  "enduro-long": "Enduro Long Sleeve",
  bib: "Bibs",
  vest: "Vests",
  gloves: "Gloves",
  shorts: "Shorts",
  socks: "Socks",
};

const CATEGORY_ICONS: Record<string, string> = {
  jersey: "🚴",
  "enduro-short": "👕",
  "enduro-long": "🏔️",
  bib: "🩱",
  vest: "🧥",
  gloves: "🧤",
  shorts: "🩳",
  socks: "🧦",
};

const CAT_ORDER = ["jersey", "enduro-short", "enduro-long", "bib", "vest"];

interface ProductSelectorProps {
  productTypes: ProductType[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
}

export default function ProductSelector({
  productTypes,
  selectedProductId,
  onSelect,
}: ProductSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group products by category, preserving sort_order within each group
  const grouped = productTypes.reduce<Record<string, ProductType[]>>((acc, pt) => {
    const cat = pt.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pt);
    return acc;
  }, {});

  // Keep category order stable: jerseys → bibs → vests → everything else alphabetically
  const categoryOrder = ["jersey", "bib", "vest"];
  const categories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)).sort(),
  ];

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
        Step 2 — Select Your Product
      </h3>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{CATEGORY_ICONS[cat] || "📦"}</span>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              </h4>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {grouped[cat].map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => onSelect(pt.id)}
                  onMouseEnter={() => setHoveredId(pt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative rounded-2xl overflow-hidden transition-all duration-200 text-left border-2 ${
                    selectedProductId === pt.id
                      ? "border-blue-500 ring-4 ring-blue-100 shadow-md"
                      : hoveredId === pt.id
                      ? "border-gray-200 shadow-md"
                      : "border-transparent shadow-sm bg-white"
                  }`}
                >
                  <div className="p-5 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl mb-2">
                        {PRODUCT_ICONS[pt.id] || CATEGORY_ICONS[pt.category] || "📦"}
                      </div>
                      {selectedProductId === pt.id && (
                        <div className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-gray-800">{pt.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {PRODUCT_TAGLINES[pt.id] || pt.description}
                    </p>
                    {pt.example_url && (
                      <a
                        href={pt.example_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center mt-3 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        View on CMS Sportswear ↗
                      </a>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
