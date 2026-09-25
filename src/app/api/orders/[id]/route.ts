import { NextRequest } from "next/server";
import {
  queryOne,
  query,
  execute,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const order = await queryOne<any>(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    const items = await query<any>(
      `SELECT oi.*, pt.name as product_name, d.name as design_name, s.name as size_name
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       JOIN designs d ON oi.design_id = d.id
       JOIN sizes s ON oi.size_id = s.id
       WHERE oi.order_id = ?`,
      [id]
    );

    return successResponse({ order: { ...order, items } });
  } catch (error) {
    console.error("Error fetching order:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status) {
      await execute(
        "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
        [body.status, id]
      );
    }

    if (body.notes !== undefined) {
      await execute(
        "UPDATE orders SET notes = ?, updated_at = NOW() WHERE id = ?",
        [body.notes, id]
      );
    }

    return successResponse({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    return errorResponse("Failed to update order", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute("DELETE FROM orders WHERE id = ?", [id]);
    return successResponse({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return errorResponse("Failed to delete order", 500);
  }
}
