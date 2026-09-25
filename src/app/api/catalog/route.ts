import { NextResponse } from "next/server";
import { query } from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export async function GET() {
  try {
    console.log("🔍 Catalog API: Starting query execution");
    const designsQuery = "SELECT * FROM designs WHERE active = 1 ORDER BY sort_order";
    console.log("🔍 Designs query:", designsQuery);
    
    const [designs, productTypes, sizes, pricingTiers, productDesigns] =
      await Promise.all([
        query<any>(designsQuery, []),
        query<any>(
          "SELECT id, name, description, category, example_url, fit_options, active, sort_order FROM product_types WHERE active = 1 ORDER BY sort_order",
          []
        ),
        query<any>("SELECT * FROM sizes ORDER BY sort_order", []),
        query<any>(
          "SELECT * FROM pricing_tiers ORDER BY product_type_id, min_qty",
          []
        ),
        query<any>(
          "SELECT product_type_id, design_id FROM product_designs WHERE active = 1",
          []
        ),
      ]);
    
    console.log("✅ Catalog query successful:", { designs: designs.length, productTypes: productTypes.length });

    // Get current exchange rate and calculate USD in real-time
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;

    const pricingTiersWithLiveUSD = pricingTiers.map((tier: any) => ({
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
