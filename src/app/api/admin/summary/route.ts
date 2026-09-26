import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/route-helpers";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    console.warn("Unauthorized admin summary request");
    return unauthorized();
  }
  try {
    // Total orders and items
    const stats = await queryOne<{ total_orders: number; total_items: number }>(
      `SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items) as total_items`
    );

    // Get live exchange rate
    const { compra: exchangeRate } = await getExchangeRate();

    // Quantities by product type (only column available in current schema)
    const byProduct = await query<{ product_type_id: string; product_name: string; total_qty: number }>(
      `SELECT 
        oi.product_type_id,
        pt.name as product_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       GROUP BY oi.product_type_id, pt.name, pt.sort_order
       ORDER BY pt.sort_order`
    );

    // Calculate pricing based on total quantities and live exchange rate
    const byProductWithPricing = byProduct.map((p) => {
      const priceCRC = getUnitPriceCRC(p.product_type_id, p.total_qty) ?? 0;
      const priceUSD = crcToUsd(priceCRC, exchangeRate);
      return {
        ...p,
        tierPriceCRC: priceCRC,
        tierPriceUSD: priceUSD,
        totalCRC: priceCRC * p.total_qty,
        totalUSD: priceUSD * p.total_qty,
      };
    });

    // All orders with basic info (design and size fields not available in current schema)
    const orders = await query<any>(
      `SELECT o.*
       FROM orders o 
       ORDER BY o.created_at DESC`
    );

    return NextResponse.json({
      summary: {
        totalOrders: stats?.total_orders ?? 0,
        totalItems: stats?.total_items ?? 0,
        byProduct: byProductWithPricing,
        byDesign: [],
        bySize: [],
        byFit: [],
        fullBreakdown: [],
      },
      orders: orders,
      exchangeRate,
    });
  } catch (error) {
    console.error("Error fetching admin summary:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch admin summary", details: errorMessage },
      { status: 500 }
    );
  }
}
