import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

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
         WHERE oi.order_id = ?`
      )
      .all(id);

    return NextResponse.json({ order: { ...order, items } });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const result = db.prepare("DELETE FROM orders WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    if (body.status) {
      db.prepare(
        "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(body.status, id);
    }

    if (body.notes !== undefined) {
      db.prepare(
        "UPDATE orders SET notes = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(body.notes, id);
    }

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
