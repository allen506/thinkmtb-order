"use client";

import { PricingTier } from "@/lib/pricing";

// Fallback rate used when live rate hasn't loaded yet
const FALLBACK_RATE = 464.54;

function crcToUsd(crc: number, rate: number): number {
  return Math.round((crc / rate) * 100) / 100;
}

interface PricingTableProps {
  productTypeId: string;
  productName: string;
  productUrl?: string;
  tiers: PricingTier[];
  currentTotalQty?: number;
  exchangeRate?: number;
}

export default function PricingTable({
  productName,
  productUrl,
  tiers,
  currentTotalQty,
  exchangeRate,
}: PricingTableProps) {
  const rate = exchangeRate ?? FALLBACK_RATE;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 sm:px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-semibold text-xs sm:text-sm text-gray-700">
          {productUrl ? (
            <a href={productUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              {productName} ↗
            </a>
          ) : (
            productName
          )}
        </h4>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm min-w-[300px]">
        <thead>
          <tr className="bg-gray-50 text-gray-900">
            <th className="px-2 sm:px-4 py-2 text-left font-semibold">Quantity</th>
            <th className="px-2 sm:px-4 py-2 text-right font-semibold">Price (CRC)</th>
            <th className="px-2 sm:px-4 py-2 text-right font-semibold">Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => {
            const isActive =
              currentTotalQty !== undefined &&
              currentTotalQty >= tier.minQty &&
              currentTotalQty <= tier.maxQty;
            const priceUSD = crcToUsd(tier.priceCRC, rate);
            return (
              <tr
                key={i}
                className={`border-t border-gray-100 ${
                  isActive
                    ? "bg-green-50 font-semibold text-green-800"
                    : "text-gray-700"
                }`}
              >
                <td className="px-2 sm:px-4 py-2">
                  <span className="whitespace-nowrap">
                    {tier.minQty === tier.maxQty
                      ? `${tier.minQty}`
                      : `${tier.minQty}–${tier.maxQty}`}
                  </span>
                  {isActive && (
                    <span className="ml-1 sm:ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-2 sm:px-4 py-2 text-right">
                  <span className="whitespace-nowrap">₡{tier.priceCRC.toLocaleString()}</span>
                </td>
                <td className="px-2 sm:px-4 py-2 text-right">
                  <span className="whitespace-nowrap">${priceUSD.toFixed(2)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
