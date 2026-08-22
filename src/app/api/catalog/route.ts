import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export async function GET() {
  try {
    const db = getDb();
    const designs = db
      .prepare("SELECT * FROM designs WHERE active = 1 ORDER BY sort_order")
      .all();
    const productTypes = db
      .prepare("SELECT id, name, description, category, example_url, fit_options, active, sort_order FROM product_types WHERE active = 1 ORDER BY sort_order")
      .all();
    const sizes = db
      .prepare("SELECT * FROM sizes ORDER BY sort_order")
      .all();
    const pricingTiers = db
      .prepare("SELECT * FROM pricing_tiers ORDER BY product_type_id, min_qty")
      .all();
    const productDesigns = db
      .prepare("SELECT product_type_id, design_id FROM product_designs WHERE active = 1")
      .all();

    // Get current exchange rate and calculate USD in real-time for all tiers
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;

    const pricingTiersWithLiveUSD = (pricingTiers as any[]).map((tier) => ({
      ...tier,
      price_usd: crcToUsd(tier.price_crc, rate),
    }));

    return NextResponse.json({
      designs,
      productTypes,
      sizes,
      pricingTiers: pricingTiersWithLiveUSD,
      productDesigns,
      exchangeRate: rate,
    });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog data" },
      { status: 500 }
    );
  }
}
