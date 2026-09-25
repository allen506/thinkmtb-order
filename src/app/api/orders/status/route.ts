import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

export async function GET() {
  try {
    const result = await queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?`,
      ["ordering_active"]
    );

    const orderingActive = result ? result.value === "1" : true;
    return successResponse({ orderingActive });
  } catch (error) {
    console.error("Error fetching ordering status:", error);
    return errorResponse("Failed to fetch ordering status", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    const body = await request.json();
    const { orderingActive } = body;

    if (typeof orderingActive !== "boolean") {
      return errorResponse("orderingActive must be a boolean", 400);
    }

    await execute(
      `UPDATE app_settings SET value = ?, updated_at = NOW() WHERE key = ?`,
      [orderingActive ? "1" : "0", "ordering_active"]
    );

    return successResponse({ orderingActive, success: true });
  } catch (error) {
    console.error("Error updating ordering status:", error);
    return errorResponse("Failed to update ordering status", 500);
  }
}
