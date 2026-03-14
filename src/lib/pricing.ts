// Pricing tiers for each product type
// Prices are based on TOTAL quantity ordered across all orders for that product type

export interface PricingTier {
  minQty: number;
  maxQty: number;
  priceCRC: number;
  priceUSD: number;
}

export const PRICING: Record<string, PricingTier[]> = {
  "pro-jersey": [
    { minQty: 1, maxQty: 1, priceCRC: 45000, priceUSD: 91 },
    { minQty: 2, maxQty: 5, priceCRC: 42000, priceUSD: 85 },
    { minQty: 6, maxQty: 10, priceCRC: 40000, priceUSD: 81 },
    { minQty: 11, maxQty: 20, priceCRC: 38000, priceUSD: 77 },
    { minQty: 21, maxQty: 30, priceCRC: 36000, priceUSD: 73 },
    { minQty: 31, maxQty: 50, priceCRC: 34000, priceUSD: 69 },
    { minQty: 51, maxQty: 100, priceCRC: 29000, priceUSD: 59 },
  ],
  "enduro-jersey": [
    { minQty: 1, maxQty: 1, priceCRC: 32000, priceUSD: 64.65 },
    { minQty: 2, maxQty: 5, priceCRC: 30000, priceUSD: 60.61 },
    { minQty: 6, maxQty: 10, priceCRC: 28000, priceUSD: 56.57 },
    { minQty: 11, maxQty: 20, priceCRC: 26000, priceUSD: 52.53 },
    { minQty: 21, maxQty: 30, priceCRC: 24000, priceUSD: 48.48 },
    { minQty: 31, maxQty: 50, priceCRC: 22000, priceUSD: 44.44 },
    { minQty: 51, maxQty: 100, priceCRC: 20000, priceUSD: 40.40 },
  ],
  "wind-vest": [
    { minQty: 1, maxQty: 1, priceCRC: 32000, priceUSD: 64.65 },
    { minQty: 2, maxQty: 5, priceCRC: 30000, priceUSD: 60.61 },
    { minQty: 6, maxQty: 10, priceCRC: 28000, priceUSD: 56.57 },
    { minQty: 11, maxQty: 20, priceCRC: 26000, priceUSD: 52.53 },
    { minQty: 21, maxQty: 30, priceCRC: 24000, priceUSD: 48.48 },
    { minQty: 31, maxQty: 50, priceCRC: 22000, priceUSD: 44.44 },
    { minQty: 51, maxQty: 100, priceCRC: 20000, priceUSD: 40.40 },
  ],
};

/**
 * Get the price per unit for a given product type and total quantity
 */
export function getUnitPrice(
  productTypeId: string,
  totalQuantity: number
): { priceCRC: number; priceUSD: number } | null {
  const tiers = PRICING[productTypeId];
  if (!tiers) return null;

  for (const tier of tiers) {
    if (totalQuantity >= tier.minQty && totalQuantity <= tier.maxQty) {
      return { priceCRC: tier.priceCRC, priceUSD: tier.priceUSD };
    }
  }

  // If quantity exceeds max tier, use the last (cheapest) tier
  const lastTier = tiers[tiers.length - 1];
  if (totalQuantity > lastTier.maxQty) {
    return { priceCRC: lastTier.priceCRC, priceUSD: lastTier.priceUSD };
  }

  return null;
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
