import { NextRequest } from "next/server";
import {
  query,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    const settings = await query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings`,
      []
    );

    const result: Record<string, any> = {};
    settings.forEach(({ key, value }) => {
      // Try to parse as number if it looks like one
      if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else if (value === "0" || value === "1") {
        result[key] = value === "1" ? 1 : 0;
      } else {
        result[key] = value;
      }
    });

    return successResponse(result);
  } catch (error) {
    console.error("Failed to fetch app settings:", error);
    return errorResponse("Failed to fetch settings", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await execute(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return errorResponse("Failed to update settings", 500);
  }
}
