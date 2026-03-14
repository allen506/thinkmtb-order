"use client";

import { useState } from "react";
import Image from "next/image";
import { Design } from "@/lib/types";

interface DesignSelectorProps {
  designs: Design[];
  selectedDesignId: string;
  onSelect: (designId: string) => void;
}

export default function DesignSelector({
  designs,
  selectedDesignId,
  onSelect,
}: DesignSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Step 2 — Select Your Design
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {designs.map((design) => (
          <button
            key={design.id}
            onClick={() => onSelect(design.id)}
            onMouseEnter={() => setHoveredId(design.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`relative rounded-xl overflow-hidden border-3 transition-all duration-200 ${
              selectedDesignId === design.id
                ? "border-blue-500 ring-4 ring-blue-200 shadow-lg scale-[1.02]"
                : hoveredId === design.id
                ? "border-gray-300 shadow-md scale-[1.01]"
                : "border-gray-200 shadow-sm"
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
        ))}
      </div>
    </div>
  );
}
