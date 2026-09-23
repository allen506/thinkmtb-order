import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const teamId = request.headers.get("x-team-id");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID required in headers" },
        { status: 400 }
      );
    }

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { productId, quantity } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Product ID and quantity (>= 1) required" },
        { status: 400 }
      );
    }

    // Check for active price override
    const override = db
      .prepare(
        `
      SELECT price_crc, price_usd, expires_at
      FROM price_overrides
      WHERE product_type_id = ? AND team_id = ? AND tenant_id = ?
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      LIMIT 1
    `
      )
      .get(productId, teamId, tenant.id) as any;

    if (override) {
      return NextResponse.json({
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
    const tier = db
      .prepare(
        `
      SELECT price_crc, price_usd
      FROM pricing_tiers
      WHERE product_type_id = ? AND tenant_id = ?
      AND min_qty <= ? AND (max_qty IS NULL OR max_qty >= ?)
      ORDER BY min_qty DESC
      LIMIT 1
    `
      )
      .get(productId, tenant.id, quantity, quantity) as any;

    if (!tier) {
      return NextResponse.json(
        { error: "No pricing available for this quantity" },
        { status: 400 }
      );
    }

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Failed to calculate price" },
      { status: 500 }
    );
  }
}
