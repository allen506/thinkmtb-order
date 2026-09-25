import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

// DELETE admin email
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

    const email = await queryOne<{ email: string }>(
      "SELECT email FROM admin_emails WHERE id = ?",
      [id]
    );

    if (!email) {
      return errorResponse("Email not found", 404);
    }

    await execute("DELETE FROM admin_emails WHERE id = ?", [id]);

    return successResponse({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin email:", error);
    return errorResponse("Failed to delete email", 500);
  }
}
