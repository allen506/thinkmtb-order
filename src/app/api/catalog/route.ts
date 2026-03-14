import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const designs = db
      .prepare("SELECT * FROM designs WHERE active = 1 ORDER BY sort_order")
      .all();
    const productTypes = db
      .prepare("SELECT * FROM product_types WHERE active = 1 ORDER BY sort_order")
      .all();
    const sizes = db
      .prepare("SELECT * FROM sizes ORDER BY sort_order")
      .all();
    const pricingTiers = db
      .prepare("SELECT * FROM pricing_tiers ORDER BY product_type_id, min_qty")
      .all();

    return NextResponse.json({
      designs,
      productTypes,
      sizes,
      pricingTiers,
    });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog data" },
      { status: 500 }
    );
  }
}
