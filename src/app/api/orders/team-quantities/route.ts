import { NextResponse } from "next/server";
import { query } from "@/lib/route-helpers";

// Returns total quantities per product type across all non-cancelled team orders
// Used to determine current pricing tier
export async function GET() {
  try {
    const totals = await query<{ product_type_id: string; total_qty: number }>(
      `SELECT product_type_id, COALESCE(SUM(quantity), 0) as total_qty
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != ?
       GROUP BY product_type_id`,
      ["cancelled"]
    );

    const result: Record<string, number> = {};
    for (const row of totals) {
      result[row.product_type_id] = row.total_qty;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch team quantities:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
