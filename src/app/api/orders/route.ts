import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { OrderFormData } from "@/lib/types";

export async function GET() {
  try {
    const db = getDb();
    const orders = db
      .prepare(
        `SELECT o.*
         FROM orders o
         WHERE o.status != 'cancelled'
         ORDER BY o.created_at DESC`
      )
      .all() as { id: string; user_name: string; status: string; notes: string; created_at: string }[];

    const getItems = db.prepare(
      `SELECT oi.id, oi.product_type_id, oi.design_id, oi.size_id, oi.quantity,
        pt.name as product_name,
        d.name as design_name,
        s.name as size_name
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       JOIN designs d ON oi.design_id = d.id
       JOIN sizes s ON oi.size_id = s.id
       WHERE oi.order_id = ?`
    );

    const result = orders.map((order) => ({
      ...order,
      items: getItems.all(order.id),
    }));

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderFormData = await request.json();

    // Validate
    if (!body.userName) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate each item has required fields
    for (const item of body.items) {
      if (!item.productTypeId || !item.designId || !item.sizeId || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: "Each item must have a product type, design, size, and quantity >= 1" },
          { status: 400 }
        );
      }
    }

    const db = getDb();
    const orderId = uuidv4();

    const insertOrder = db.prepare(
      `INSERT INTO orders (id, user_name, notes) 
       VALUES (?, ?, ?)`
    );

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_type_id, design_id, size_id, quantity) 
       VALUES (?, ?, ?, ?, ?)`
    );

    const transaction = db.transaction(() => {
      insertOrder.run(
        orderId,
        body.userName,
        body.notes || null
      );

      for (const item of body.items) {
        insertItem.run(
          orderId,
          item.productTypeId,
          item.designId,
          item.sizeId,
          item.quantity
        );
      }
    });

    transaction();

    return NextResponse.json({ orderId, message: "Order placed successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
