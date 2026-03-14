"use client";

import { PricingTier } from "@/lib/pricing";

interface PricingTableProps {
  productTypeId: string;
  productName: string;
  productUrl?: string;
  tiers: PricingTier[];
  currentTotalQty?: number;
}

export default function PricingTable({
  productName,
  productUrl,
  tiers,
  currentTotalQty,
}: PricingTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-semibold text-sm text-gray-700">
          {productUrl ? (
            <a href={productUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              {productName} ↗
            </a>
          ) : (
            productName
          )}
        </h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="px-4 py-2 text-left">Quantity</th>
            <th className="px-4 py-2 text-right">Price (CRC)</th>
            <th className="px-4 py-2 text-right">Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => {
            const isActive =
              currentTotalQty !== undefined &&
              currentTotalQty >= tier.minQty &&
              currentTotalQty <= tier.maxQty;
            return (
              <tr
                key={i}
                className={`border-t border-gray-100 ${
                  isActive
                    ? "bg-green-50 font-semibold text-green-800"
                    : "text-gray-700"
                }`}
              >
                <td className="px-4 py-2">
                  {tier.minQty === tier.maxQty
                    ? `${tier.minQty}`
                    : `${tier.minQty}–${tier.maxQty}`}
                  {isActive && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  ₡{tier.priceCRC.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  ${tier.priceUSD.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
