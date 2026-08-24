"use client";

import { useState } from "react";
import Image from "next/image";
import { Design } from "@/lib/types";

export interface DesignSelection {
  designId: string;
  quantity: number;
}

interface DesignSelectorProps {
  designs: Design[];
  selectedDesigns: DesignSelection[];
  onSelectDesigns: (selections: DesignSelection[]) => void;
  productCategory?: string;
}

export default function DesignSelector({
  designs,
  selectedDesigns,
  onSelectDesigns,
  productCategory,
}: DesignSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter designs by category if productCategory is provided
  const filteredDesigns = productCategory
    ? designs.filter((design) => {
        try {
          const designedFor = JSON.parse(design.designed_for || "[]");
          if (Array.isArray(designedFor)) {
            return designedFor.includes(productCategory);
          }
        } catch {
          return true;
        }
        return false;
      })
    : designs;

  const toggleDesign = (designId: string) => {
    const existing = selectedDesigns.find((s) => s.designId === designId);
    if (existing) {
      onSelectDesigns(selectedDesigns.filter((s) => s.designId !== designId));
    } else {
      onSelectDesigns([...selectedDesigns, { designId, quantity: 1 }]);
    }
  };

  const updateQuantity = (designId: string, quantity: number) => {
    if (quantity > 0) {
      onSelectDesigns(
        selectedDesigns.map((s) =>
          s.designId === designId ? { ...s, quantity } : s
        )
      );
    }
  };

  const isSelected = (designId: string) =>
    selectedDesigns.some((s) => s.designId === designId);
  const getQuantity = (designId: string) =>
    selectedDesigns.find((s) => s.designId === designId)?.quantity || 1;

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
        Step 3 — Select Your Designs
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        You can select multiple designs and specify quantities for each
      </p>
      {!productCategory ? (
        <p className="text-gray-400 text-sm py-2">Select a product first to see available designs.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredDesigns.length === 0 ? (
            <p className="col-span-full text-gray-500 text-sm py-4">
              No designs available for this product type
            </p>
          ) : (
            filteredDesigns.map((design) => {
              const selected = isSelected(design.id);
              const qty = getQuantity(design.id);
              return (
                <div
                  key={design.id}
                  className="flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => toggleDesign(design.id)}
                    onMouseEnter={() => setHoveredId(design.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`relative rounded-2xl overflow-hidden transition-all duration-200 border-2 flex-1 ${
                      selected
                        ? "border-blue-500 ring-4 ring-blue-100 shadow-md"
                        : hoveredId === design.id
                        ? "border-gray-200 shadow-md"
                        : "border-transparent shadow-sm bg-white"
                    }`}
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                      <Image
                        src={design.image_url}
                        alt={design.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      {selected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
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
                    <div className="p-3 bg-white">
                      <p className="font-semibold text-sm text-gray-800">
                        {design.name}
                      </p>
                      {design.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {design.description}
                        </p>
                      )}
                    </div>
                  </button>
                  {selected && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                      <label className="text-xs font-medium text-gray-700">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={qty}
                        onChange={(e) =>
                          updateQuantity(design.id, parseInt(e.target.value) || 1)
                        }
                        className="w-12 px-2 py-1 rounded border border-blue-300 text-sm text-center font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
