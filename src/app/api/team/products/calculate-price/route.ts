import { NextRequest, NextResponse } from "next/server";
import {
  queryOne,
  extractContext,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";

export async function POST(request: NextRequest) {
  try {
    const ctx = extractContext(request);
    const teamId = request.headers.get("x-team-id");

    if (!teamId) {
      return errorResponse("Team ID required in headers", 400);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    const { productId, quantity } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return errorResponse("Product ID and quantity (>= 1) required", 400);
    }

    // Check for active price override
    const override = await queryOne<any>(
      `
      SELECT price_crc, price_usd, expires_at
      FROM price_overrides
      WHERE product_type_id = ? AND team_id = ? AND tenant_id = ?
      AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `,
      [productId, teamId, tenant.id]
    );

    if (override) {
      return successResponse({
        success: true,
        productId,
        quantity,
        priceCrc: override.price_crc,
        priceUsd: override.price_usd,
        isOverride: true,
        totalCrc: override.price_crc * quantity,
        totalUsd: override.price_usd * quantity,
      });
    }

    // Get pricing tier for this quantity
    const tier = await queryOne<any>(
      `
      SELECT price_crc, price_usd
      FROM pricing_tiers
      WHERE product_type_id = ? AND tenant_id = ?
      AND min_qty <= ? AND (max_qty IS NULL OR max_qty >= ?)
      ORDER BY min_qty DESC
      LIMIT 1
    `,
      [productId, tenant.id, quantity, quantity]
    );

    if (!tier) {
      return errorResponse("No pricing available for this quantity", 400);
    }

    return successResponse({
      success: true,
      productId,
      quantity,
      priceCrc: tier.price_crc,
      priceUsd: tier.price_usd,
      isOverride: false,
      totalCrc: tier.price_crc * quantity,
      totalUsd: tier.price_usd * quantity,
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return errorResponse("Failed to calculate price", 500);
  }
}
