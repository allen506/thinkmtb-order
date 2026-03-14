import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const orders = db
      .prepare(
        `SELECT * FROM orders WHERE user_name LIKE ? COLLATE NOCASE ORDER BY created_at DESC`
      )
      .all(`%${name}%`) as { id: string }[];

    const ordersWithItems = orders.map((order) => {
      const items = db
        .prepare(
          `SELECT oi.*, 
            pt.name as product_name,
            d.name as design_name,
            s.name as size_name
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

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error searching orders:", error);
    return NextResponse.json(
      { error: "Failed to search orders" },
      { status: 500 }
    );
  }
}
