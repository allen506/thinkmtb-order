"use client";

import { useState } from "react";
import Image from "next/image";
import { Design } from "@/lib/types";

interface DesignSelectorProps {
  designs: Design[];
  selectedDesignId: string;
  onSelect: (designId: string) => void;
  productCategory?: string;
}

export default function DesignSelector({
  designs,
  selectedDesignId,
  onSelect,
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
          // If designed_for is not valid JSON (old designs), show all
          return true;
        }
        return false;
      })
    : designs;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Step 3 — Select Your Design
      </h3>
      {!productCategory ? (
        <p className="text-gray-400 text-sm py-2">Select a product first to see available designs.</p>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredDesigns.length === 0 ? (
          <p className="col-span-full text-gray-500 text-sm py-4">
            No designs available for this product type
          </p>
        ) : (
          filteredDesigns.map((design) => (
          <button
            key={design.id}
            type="button"
            onClick={() => onSelect(design.id)}
            onMouseEnter={() => setHoveredId(design.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
              selectedDesignId === design.id
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
              {selectedDesignId === design.id && (
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
        ))
        )}
      </div>
      )}
    </div>
  );
}
