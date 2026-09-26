import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/route-helpers";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
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

    // Quantities by product type
    const byProduct = await query<{ product_type_id: string; product_name: string; total_qty: number }>(
      `SELECT 
        oi.product_type_id,
        pt.name as product_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       GROUP BY oi.product_type_id
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

    // Quantities by design
    const byDesign = await query<{ design_id: string; design_name: string; total_qty: number }>(
      `SELECT 
        oi.design_id,
        d.name as design_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN designs d ON oi.design_id = d.id
       GROUP BY oi.design_id
       ORDER BY d.sort_order`
    );

    // Quantities by size
    const bySize = await query<{ size_id: string; size_name: string; total_qty: number }>(
      `SELECT 
        oi.size_id,
        s.name as size_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN sizes s ON oi.size_id = s.id
       GROUP BY oi.size_id
       ORDER BY s.sort_order`
    );

    // Quantities by fit/gender
    const byFit = await query<{ fit: string; total_qty: number }>(
      `SELECT 
        COALESCE(NULLIF(oi.fit, ''), 'unisex') as fit,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       GROUP BY COALESCE(NULLIF(oi.fit, ''), 'unisex')
       ORDER BY fit`
    );

    // Quantities by product + design + size (full breakdown)
    const fullBreakdown = await query<{
      product_type_id: string;
      product_name: string;
      design_id: string;
      design_name: string;
      size_id: string;
      size_name: string;
      fit: string;
      total_qty: number;
    }>(
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
    );

    // All orders with items for detail view
    const orders = await query<{ id: string }>(
      `SELECT o.*,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_qty
       FROM orders o 
       ORDER BY o.created_at DESC`
    );

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await query(
          `SELECT oi.*, 
            pt.name as product_name,
            d.name as design_name,
            s.name as size_name,
            COALESCE(oi.fit, '') as fit
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = $1
           ORDER BY pt.sort_order, d.sort_order, s.sort_order`,
          [order.id]
        );
        return { ...order, items };
      })
    );

    return NextResponse.json({
      summary: {
        totalOrders: stats?.total_orders ?? 0,
        totalItems: stats?.total_items ?? 0,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch admin summary", details: errorMessage },
      { status: 500 }
    );
  }
}
