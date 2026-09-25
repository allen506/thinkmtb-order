import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    const { id } = await params;
    const { status, adminNotes } = await request.json();

    const validStatuses = ["pending", "confirmed", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse("Invalid status", 400);
    }

    const payment = await queryOne<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM payments WHERE id = ?",
      [id]
    );
    if (!payment) return errorResponse("Payment not found", 404);

    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (adminNotes !== undefined) {
      updates.push("admin_notes = ?");
      values.push(adminNotes);
    }
    values.push(id);

    await execute(
      `UPDATE payments SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Auto-mark the order as paid when payment is confirmed
    if (status === "confirmed") {
      await execute(
        "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
        ["paid", payment.order_id]
      );
    }

    return successResponse({ message: "Payment updated" });
  } catch (error) {
    console.error("Error updating payment:", error);
    return errorResponse("Failed to update payment", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute("DELETE FROM payments WHERE id = ?", [id]);
    return successResponse({ message: "Payment deleted" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return errorResponse("Failed to delete payment", 500);
  }
}
