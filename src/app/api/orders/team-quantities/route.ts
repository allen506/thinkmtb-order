import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Returns total quantities per product type across all team orders
// Used to determine current pricing tier
export async function GET() {
  try {
    const db = getDb();

    const totals = db
      .prepare(
        `SELECT product_type_id, COALESCE(SUM(quantity), 0) as total_qty
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'cancelled'
         GROUP BY product_type_id`
      )
      .all() as { product_type_id: string; total_qty: number }[];

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
