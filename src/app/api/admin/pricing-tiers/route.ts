import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    let query = `
      SELECT 
        id,
        product_type_id,
        min_qty,
        max_qty,
        price_crc
      FROM pricing_tiers
    `;

    // Get current exchange rate
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;

    let tiers: any[] = [];
    if (productId) {
      query += ` WHERE product_type_id = ?`;
      tiers = db.prepare(query).all(productId) as any[];
    } else {
      tiers = db.prepare(query).all() as any[];
    }

    // Calculate USD in real-time for each tier
    const tiersWithUSD = tiers.map((tier) => ({
      ...tier,
      price_usd: crcToUsd(tier.price_crc, rate),
    }));

    return NextResponse.json({ tiers: tiersWithUSD, exchangeRate: rate });
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing tiers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const body = await req.json();
    const { product_type_id, min_qty, max_qty, price_crc } = body;

    if (!product_type_id || min_qty === undefined || !price_crc) {
      return NextResponse.json(
        {
          error: "product_type_id, min_qty, max_qty, price_crc are required",
        },
        { status: 400 }
      );
    }

    // Note: price_usd is NOT stored. It's calculated in real-time based on current exchange rate.
    const id = db
      .prepare(
        `
      INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd)
      VALUES (?, ?, ?, ?, NULL)
    `
      )
      .run(product_type_id, min_qty, max_qty || min_qty, price_crc).lastInsertRowid;

    return NextResponse.json(
      { id, message: "Pricing tier created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating pricing tier:", error);
    return NextResponse.json(
      { error: "Failed to create pricing tier" },
      { status: 500 }
    );
  }
}
