import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const db = getDb();

    // Total orders and items
    const stats = db
      .prepare(
        `SELECT 
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COALESCE(SUM(quantity), 0) FROM order_items) as total_items`
      )
      .get() as { total_orders: number; total_items: number };

    // Get live exchange rate
    const { compra: exchangeRate } = await getExchangeRate();

    // Quantities by product type
    const byProduct = db
      .prepare(
        `SELECT 
          oi.product_type_id,
          pt.name as product_name,
          SUM(oi.quantity) as total_qty
         FROM order_items oi
         JOIN product_types pt ON oi.product_type_id = pt.id
         GROUP BY oi.product_type_id
         ORDER BY pt.sort_order`
      )
      .all() as { product_type_id: string; product_name: string; total_qty: number }[];

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

    // Quantities by design
    const byDesign = db
      .prepare(
        `SELECT 
          oi.design_id,
          d.name as design_name,
          SUM(oi.quantity) as total_qty
         FROM order_items oi
         JOIN designs d ON oi.design_id = d.id
         GROUP BY oi.design_id
         ORDER BY d.sort_order`
      )
      .all();

    // Quantities by size
    const bySize = db
      .prepare(
        `SELECT 
          oi.size_id,
          s.name as size_name,
          SUM(oi.quantity) as total_qty
         FROM order_items oi
         JOIN sizes s ON oi.size_id = s.id
         GROUP BY oi.size_id
         ORDER BY s.sort_order`
      )
      .all();

    // Quantities by fit/gender
    const byFit = db
      .prepare(
        `SELECT 
          COALESCE(NULLIF(oi.fit, ''), 'unisex') as fit,
          SUM(oi.quantity) as total_qty
         FROM order_items oi
         GROUP BY COALESCE(NULLIF(oi.fit, ''), 'unisex')
         ORDER BY fit`
      )
      .all();

    // Quantities by product + design + size (full breakdown)
    const fullBreakdown = db
      .prepare(
        `SELECT 
          oi.product_type_id,
          pt.name as product_name,
          oi.design_id,
          d.name as design_name,
          oi.size_id,
          s.name as size_name,
          COALESCE(oi.fit, '') as fit,
          SUM(oi.quantity) as total_qty
         FROM order_items oi
         JOIN product_types pt ON oi.product_type_id = pt.id
         JOIN designs d ON oi.design_id = d.id
         JOIN sizes s ON oi.size_id = s.id
         GROUP BY oi.product_type_id, oi.design_id, oi.size_id, oi.fit
         ORDER BY pt.sort_order, d.sort_order, s.sort_order`
      )
      .all();

    // All orders with items for detail view
    const orders = db
      .prepare(
        `SELECT o.*,
          (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_qty
         FROM orders o 
         ORDER BY o.created_at DESC`
      )
      .all();

    const orderDetails = (orders as { id: string }[]).map((order) => {
      const items = db
        .prepare(
          `SELECT oi.*, 
            pt.name as product_name,
            d.name as design_name,
            s.name as size_name,
            COALESCE(oi.fit, '') as fit
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = ?
           ORDER BY pt.sort_order, d.sort_order, s.sort_order`
        )
        .all(order.id);
      return { ...order, items };
    });

    return NextResponse.json({
      summary: {
        totalOrders: stats.total_orders,
        totalItems: stats.total_items,
        byProduct: byProductWithPricing,
        byDesign,
        bySize,
        byFit,
        fullBreakdown,
      },
      orders: orderDetails,
      exchangeRate,
    });
  } catch (error) {
    console.error("Error fetching admin summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin summary" },
      { status: 500 }
    );
  }
}
