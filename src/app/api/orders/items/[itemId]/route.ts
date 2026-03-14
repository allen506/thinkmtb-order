import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// PATCH - update an order item's fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const db = getDb();

    const item = db
      .prepare("SELECT * FROM order_items WHERE id = ?")
      .get(itemId);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.productTypeId) {
      updates.push("product_type_id = ?");
      values.push(body.productTypeId);
    }
    if (body.designId) {
      updates.push("design_id = ?");
      values.push(body.designId);
    }
    if (body.sizeId) {
      updates.push("size_id = ?");
      values.push(body.sizeId);
    }
    if (body.quantity && body.quantity > 0) {
      updates.push("quantity = ?");
      values.push(body.quantity);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(Number(itemId));
    db.prepare(`UPDATE order_items SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values
    );

    return NextResponse.json({ message: "Item updated" });
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE a single order item by its ID
// If it was the last item in the order, delete the order too
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const db = getDb();

    // Find the item and its parent order
    const item = db
      .prepare("SELECT * FROM order_items WHERE id = ?")
      .get(itemId) as { id: number; order_id: string } | undefined;

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const orderId = item.order_id;

    // Delete the item
    db.prepare("DELETE FROM order_items WHERE id = ?").run(itemId);

    // Check if there are remaining items in the order
    const remaining = db
      .prepare("SELECT COUNT(*) as count FROM order_items WHERE order_id = ?")
      .get(orderId) as { count: number };

    // If no items left, delete the order too
    if (remaining.count === 0) {
      db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
      return NextResponse.json({
        message: "Item deleted. Order removed (no items remaining).",
        orderDeleted: true,
      });
    }

    return NextResponse.json({
      message: "Item deleted",
      orderDeleted: false,
    });
  } catch (error) {
    console.error("Error deleting order item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
