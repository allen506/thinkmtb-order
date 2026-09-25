import { NextRequest } from "next/server";
import { queryOne, execute, errorResponse, successResponse } from "@/lib/route-helpers";

// PATCH - update an order item's fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const item = await queryOne<any>(
      "SELECT * FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return errorResponse("Item not found", 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

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
    if ("sleeveLength" in body) {
      updates.push("sleeve_length = ?");
      values.push(body.sleeveLength || null);
    }
    if ("fit" in body) {
      updates.push("fit = ?");
      values.push(body.fit || null);
    }

    if (updates.length === 0) {
      return errorResponse("No fields to update", 400);
    }

    updates.push("updated_at = NOW()");
    values.push(itemId);

    await execute(`UPDATE order_items SET ${updates.join(", ")} WHERE id = ?`, values);
    return successResponse({ message: "Item updated" });
  } catch (error) {
    console.error("Error updating order item:", error);
    return errorResponse("Failed to update item", 500);
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

    // Find the item and its parent order
    const item = await queryOne<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return errorResponse("Item not found", 404);
    }

    const orderId = item.order_id;

    // Delete the item
    await execute("DELETE FROM order_items WHERE id = ?", [itemId]);

    // Check if there are remaining items in the order
    const remaining = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE order_id = ?",
      [orderId]
    );

    // If no items left, delete the order too
    if (!remaining || remaining.count === 0) {
      await execute("DELETE FROM orders WHERE id = ?", [orderId]);
    }

    return successResponse({ message: "Item deleted" });
  } catch (error) {
    console.error("Error deleting order item:", error);
    return errorResponse("Failed to delete item", 500);
  }
}

// GET a single order item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const item = await queryOne<any>(
      "SELECT * FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return errorResponse("Item not found", 404);
    }

    return successResponse({ item });
  } catch (error) {
    console.error("Error fetching order item:", error);
    return errorResponse("Failed to fetch item", 500);
  }
}
