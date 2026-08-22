import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export async function GET() {
  try {
    const db = getDb();

    // Get live exchange rate
    const { compra: exchangeRate } = await getExchangeRate();

    // Get total quantities per product type (for tier pricing)
    const productTotals = db
      .prepare(
        `SELECT product_type_id, SUM(quantity) as total_qty
         FROM order_items
         GROUP BY product_type_id`
      )
      .all() as { product_type_id: string; total_qty: number }[];

    const tierPrices: Record<string, { priceCRC: number; priceUSD: number }> = {};
    for (const pt of productTotals) {
      const priceCRC = getUnitPriceCRC(pt.product_type_id, pt.total_qty);
      if (priceCRC !== null) {
        tierPrices[pt.product_type_id] = {
          priceCRC,
          priceUSD: crcToUsd(priceCRC, exchangeRate),
        };
      }
    }

    // Get all orders grouped by user with their items
    const orders = db
      .prepare(
        `SELECT o.id, o.user_name, o.created_at
         FROM orders o
         WHERE o.status != 'cancelled'
         ORDER BY o.user_name COLLATE NOCASE, o.created_at`
      )
      .all() as { id: string; user_name: string; created_at: string }[];

    // Group orders by user name (case-insensitive)
    const userMap = new Map<
      string,
      {
        userName: string;
        items: {
          productName: string;
          designName: string;
          sizeName: string;
          fit: string;
          quantity: number;
          unitPriceUSD: number;
          totalUSD: number;
        }[];
        grandTotalUSD: number;
      }
    >();

    for (const order of orders) {
      const items = db
        .prepare(
          `SELECT oi.product_type_id, oi.quantity, COALESCE(oi.fit, '') as fit,
            pt.name as product_name,
            d.name as design_name,
            s.name as size_name
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = ?`
        )
        .all(order.id) as {
        product_type_id: string;
        quantity: number;
        fit: string;
        product_name: string;
        design_name: string;
        size_name: string;
      }[];

      const userKey = order.user_name.toLowerCase().trim();
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          userName: order.user_name,
          items: [],
          grandTotalUSD: 0,
        });
      }
      const user = userMap.get(userKey)!;

      for (const item of items) {
        const unitPrice = tierPrices[item.product_type_id]?.priceUSD || 0;
        const totalUSD = unitPrice * item.quantity;
        user.items.push({
          productName: item.product_name,
          designName: item.design_name,
          sizeName: item.size_name,
          fit: item.fit,
          quantity: item.quantity,
          unitPriceUSD: unitPrice,
          totalUSD,
        });
        user.grandTotalUSD += totalUSD;
      }
    }

    // Calculate team totals
    let teamTotalUSD = 0;
    let teamTotalItems = 0;
    const userTotals = Array.from(userMap.values());
    for (const u of userTotals) {
      teamTotalUSD += u.grandTotalUSD;
      for (const item of u.items) {
        teamTotalItems += item.quantity;
      }
    }

    return NextResponse.json({
      userTotals,
      teamTotalUSD,
      teamTotalItems,
      tierPrices,
      exchangeRate,
    });
  } catch (error) {
    console.error("Error fetching user totals:", error);
    return NextResponse.json(
      { error: "Failed to fetch user totals" },
      { status: 500 }
    );
  }
}
