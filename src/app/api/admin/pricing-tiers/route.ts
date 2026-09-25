import { NextRequest } from "next/server";
import {
  query,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    let sql = `
      SELECT 
        id,
        product_type_id,
        min_qty,
        max_qty,
        price_crc
      FROM pricing_tiers
    `;

    const tiers = productId
      ? await query<any>(sql + " WHERE product_type_id = ? ORDER BY min_qty", [productId])
      : await query<any>(sql + " ORDER BY product_type_id, min_qty");

    // Get current exchange rate
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;

    // Calculate USD in real-time for each tier
    const tiersWithUSD = tiers.map((tier) => ({
      ...tier,
      price_usd: crcToUsd(tier.price_crc, rate),
    }));

    return successResponse({ tiers: tiersWithUSD, exchangeRate: rate });
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return errorResponse("Failed to fetch pricing tiers", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const body = await request.json();
    const { product_type_id, min_qty, max_qty, price_crc, tenant_id } = body;

    if (!product_type_id || min_qty === undefined || !price_crc) {
      return errorResponse(
        "product_type_id, min_qty, price_crc are required",
        400
      );
    }

    const id = uuidv4();
    const tenantId = tenant_id || "default-tenant";

    await execute(
      `INSERT INTO pricing_tiers (id, product_type_id, tenant_id, min_qty, max_qty, price_crc, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, product_type_id, tenantId, min_qty, max_qty || min_qty, price_crc]
    );

    return successResponse(
      { id, message: "Pricing tier created successfully" },
      201
    );
  } catch (error) {
    console.error("Error creating pricing tier:", error);
    return errorResponse("Failed to create pricing tier", 500);
  }
}
