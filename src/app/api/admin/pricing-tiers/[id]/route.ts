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
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { min_qty, max_qty, price_crc } = body;

    // Check if tier exists
    const existing = await queryOne(
      "SELECT id FROM pricing_tiers WHERE id = ?",
      [id]
    );
    if (!existing) {
      return errorResponse("Pricing tier not found", 404);
    }

    // Build update query
    const updates = [];
    const values = [];

    if (min_qty !== undefined) {
      updates.push("min_qty = ?");
      values.push(min_qty);
    }
    if (max_qty !== undefined) {
      updates.push("max_qty = ?");
      values.push(max_qty);
    }
    if (price_crc !== undefined) {
      updates.push("price_crc = ?");
      values.push(price_crc);
    }

    if (updates.length === 0) {
      return errorResponse("No fields to update", 400);
    }

    values.push(id);
    const sql = `UPDATE pricing_tiers SET ${updates.join(", ")} WHERE id = ?`;
    await execute(sql, values);

    return successResponse({ message: "Pricing tier updated successfully" });
  } catch (error) {
    console.error("Error updating pricing tier:", error);
    return errorResponse("Failed to update pricing tier", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { id } = await params;
    await execute("DELETE FROM pricing_tiers WHERE id = ?", [id]);
    return successResponse({ message: "Pricing tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting pricing tier:", error);
    return errorResponse("Failed to delete pricing tier", 500);
  }
}
