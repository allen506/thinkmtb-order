import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    // Get products available for this team
    const products = db
      .prepare(
        `
      SELECT 
        pt.id,
        pt.name,
        pt.description,
        pt.category,
        pt.example_url,
        pt.sort_order
      FROM team_products tp
      JOIN product_types pt ON pt.id = tp.product_type_id
      WHERE tp.team_id = ? AND tp.tenant_id = ?
      ORDER BY pt.sort_order ASC
    `
      )
      .all(teamId, tenant.id);

    // Get pricing for each product
    const productsWithPricing = (products as any[]).map((product) => {
      // Check for active price override first
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
        .get(product.id, teamId, tenant.id) as any;

      if (override) {
        return {
          ...product,
          hasOverride: true,
          overridePrice: {
            priceCrc: override.price_crc,
            priceUsd: override.price_usd,
            expiresAt: override.expires_at,
          },
          pricing: [], // No tier pricing when override exists
        };
      }

      // Get regular pricing tiers
      const tiers = db
        .prepare(
          `
        SELECT min_qty, max_qty, price_crc, price_usd
        FROM pricing_tiers
        WHERE product_type_id = ? AND tenant_id = ?
        ORDER BY min_qty ASC
      `
        )
        .all(product.id, tenant.id);

      return {
        ...product,
        hasOverride: false,
        pricing: tiers,
      };
    });

    return NextResponse.json({
      success: true,
      products: productsWithPricing,
      count: productsWithPricing.length,
    });
  } catch (error) {
    console.error("Error fetching team products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
