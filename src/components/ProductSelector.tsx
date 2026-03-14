"use client";

import { useState } from "react";
import { ProductType } from "@/lib/types";

const PRODUCT_URLS: Record<string, string> = {
  "pro-jersey": "https://www.cmssportswear.com/jersey-pro-personalizado",
  "enduro-jersey":
    "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado",
  "wind-vest": "https://www.cmssportswear.com/hombres-corta-vientos-chalecos",
};

const PRODUCT_ICONS: Record<string, string> = {
  "pro-jersey": "🚴",
  "enduro-jersey": "🏔️",
  "wind-vest": "🧥",
};

const PRODUCT_TAGLINES: Record<string, string> = {
  "pro-jersey": "High-performance cycling jersey",
  "enduro-jersey": "Long sleeve MTB jersey",
  "wind-vest": "Lightweight windbreaker vest",
};

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

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Step 3 — Select Your Product
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {productTypes.map((pt) => (
          <button
            key={pt.id}
            type="button"
            onClick={() => onSelect(pt.id)}
            onMouseEnter={() => setHoveredId(pt.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative rounded-xl overflow-hidden border-3 transition-all duration-200 text-left ${
              selectedProductId === pt.id
                ? "border-blue-500 ring-4 ring-blue-200 shadow-lg scale-[1.02]"
                : hoveredId === pt.id
                ? "border-gray-300 shadow-md scale-[1.01]"
                : "border-gray-200 shadow-sm"
            }`}
          >
            <div className="p-5 bg-white">
              <div className="flex items-start justify-between">
                <div className="text-3xl mb-2">
                  {PRODUCT_ICONS[pt.id] || "📦"}
                </div>
                {selectedProductId === pt.id && (
                  <div className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="font-semibold text-sm text-gray-800">{pt.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {PRODUCT_TAGLINES[pt.id] || pt.description}
              </p>
              {PRODUCT_URLS[pt.id] && (
                <a
                  href={PRODUCT_URLS[pt.id]}
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
  );
}
