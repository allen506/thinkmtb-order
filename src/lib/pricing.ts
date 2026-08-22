// Pricing tiers for each product type
// Prices are based on TOTAL quantity ordered across all orders for that product type
// USD amounts are computed dynamically from the live CRC/USD exchange rate (compra).

export interface PricingTier {
  minQty: number;
  maxQty: number;
  priceCRC: number;
}

export const PRICING: Record<string, PricingTier[]> = {
  "pro-jersey": [
    { minQty: 1, maxQty: 1, priceCRC: 45000 },
    { minQty: 2, maxQty: 5, priceCRC: 42000 },
    { minQty: 6, maxQty: 10, priceCRC: 40000 },
    { minQty: 11, maxQty: 20, priceCRC: 38000 },
    { minQty: 21, maxQty: 30, priceCRC: 36000 },
    { minQty: 31, maxQty: 50, priceCRC: 34000 },
    { minQty: 51, maxQty: 100, priceCRC: 29000 },
  ],
  "enduro-jersey": [
    { minQty: 1, maxQty: 1, priceCRC: 32000 },
    { minQty: 2, maxQty: 5, priceCRC: 30000 },
    { minQty: 6, maxQty: 10, priceCRC: 28000 },
    { minQty: 11, maxQty: 20, priceCRC: 26000 },
    { minQty: 21, maxQty: 30, priceCRC: 24000 },
    { minQty: 31, maxQty: 50, priceCRC: 22000 },
    { minQty: 51, maxQty: 100, priceCRC: 20000 },
  ],
  "enduro-short": [
    { minQty: 1, maxQty: 1, priceCRC: 24000 },
    { minQty: 2, maxQty: 5, priceCRC: 22000 },
    { minQty: 6, maxQty: 10, priceCRC: 21000 },
    { minQty: 11, maxQty: 20, priceCRC: 20000 },
    { minQty: 21, maxQty: 30, priceCRC: 18000 },
    { minQty: 31, maxQty: 50, priceCRC: 16000 },
    { minQty: 51, maxQty: 100, priceCRC: 14000 },
  ],
  "wind-vest": [
    { minQty: 1, maxQty: 1, priceCRC: 32000 },
    { minQty: 2, maxQty: 5, priceCRC: 30000 },
    { minQty: 6, maxQty: 10, priceCRC: 28000 },
    { minQty: 11, maxQty: 20, priceCRC: 26000 },
    { minQty: 21, maxQty: 30, priceCRC: 24000 },
    { minQty: 31, maxQty: 50, priceCRC: 22000 },
    { minQty: 51, maxQty: 100, priceCRC: 20000 },
  ],
  "bib-licra-pro-line-1.0": [
    { minQty: 1, maxQty: 1, priceCRC: 35000 },
    { minQty: 2, maxQty: 5, priceCRC: 32500 },
    { minQty: 6, maxQty: 10, priceCRC: 30500 },
    { minQty: 11, maxQty: 20, priceCRC: 28500 },
    { minQty: 21, maxQty: 30, priceCRC: 26500 },
    { minQty: 31, maxQty: 50, priceCRC: 24500 },
    { minQty: 51, maxQty: 100, priceCRC: 22500 },
  ],
  "bib-licra-competition-li": [
    { minQty: 1, maxQty: 1, priceCRC: 45000 },
    { minQty: 2, maxQty: 5, priceCRC: 43000 },
    { minQty: 6, maxQty: 10, priceCRC: 41000 },
    { minQty: 11, maxQty: 20, priceCRC: 39000 },
    { minQty: 21, maxQty: 30, priceCRC: 37000 },
    { minQty: 31, maxQty: 50, priceCRC: 35000 },
    { minQty: 51, maxQty: 100, priceCRC: 33000 },
  ],
  "bib-licra-competition-se": [
    { minQty: 1, maxQty: 1, priceCRC: 60000 },
    { minQty: 2, maxQty: 5, priceCRC: 58000 },
    { minQty: 6, maxQty: 10, priceCRC: 55000 },
    { minQty: 11, maxQty: 20, priceCRC: 53000 },
    { minQty: 21, maxQty: 30, priceCRC: 51000 },
    { minQty: 31, maxQty: 50, priceCRC: 48000 },
    { minQty: 51, maxQty: 100, priceCRC: 46000 },
  ],
};

/**
 * Get the CRC price per unit for a given product type and total quantity.
 * USD should be computed by the caller using crcToUsd() with the live exchange rate.
 */
export function getUnitPriceCRC(
  productTypeId: string,
  totalQuantity: number
): number | null {
  const tiers = PRICING[productTypeId];
  if (!tiers) return null;

  for (const tier of tiers) {
    if (totalQuantity >= tier.minQty && totalQuantity <= tier.maxQty) {
      return tier.priceCRC;
    }
  }

  // If quantity exceeds max tier, use the last (cheapest) tier
  const lastTier = tiers[tiers.length - 1];
  if (totalQuantity > lastTier.maxQty) {
    return lastTier.priceCRC;
  }

  return null;
}

/** @deprecated Use getUnitPriceCRC + crcToUsd instead */
export function getUnitPrice(
  productTypeId: string,
  totalQuantity: number
): { priceCRC: number; priceUSD: number } | null {
  const priceCRC = getUnitPriceCRC(productTypeId, totalQuantity);
  if (priceCRC === null) return null;
  // Use a fixed fallback USD for backward compat — callers should migrate to getUnitPriceCRC
  return { priceCRC, priceUSD: 0 };
}

/**
 * Format CRC currency
 */
export function formatCRC(amount: number): string {
  return `₡${amount.toLocaleString("es-CR")}`;
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
