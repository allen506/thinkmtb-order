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
      // Always start with quantity 1, can be adjusted in Step 4
      onSelectDesigns([...selectedDesigns, { designId, quantity: 1 }]);
    }
  };

  const isSelected = (designId: string) =>
    selectedDesigns.some((s) => s.designId === designId);

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
        Step 3 — Select Your Designs
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Click to select multiple designs. You&apos;ll set quantities in the next step.
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
              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => toggleDesign(design.id)}
                  onMouseEnter={() => setHoveredId(design.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
                    selected
                      ? "border-blue-500 ring-4 ring-blue-100 shadow-md"
                      : hoveredId === design.id
                      ? "border-gray-200 shadow-md"
                      : "border-transparent shadow-sm bg-white"
                  }`}
                >
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    <Image
                      src={`/api/designs/${design.id}/image`}
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
