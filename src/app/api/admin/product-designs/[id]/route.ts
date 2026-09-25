import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

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

    // Check if association exists
    const existing = await queryOne(
      "SELECT id FROM product_designs WHERE id = ?",
      [id]
    );

    if (!existing) {
      return errorResponse("Association not found", 404);
    }

    await execute("DELETE FROM product_designs WHERE id = ?", [id]);

    return successResponse({ message: "Association deleted successfully" });
  } catch (error) {
    console.error("Error deleting product-design association:", error);
    return errorResponse("Failed to delete association", 500);
  }
}
