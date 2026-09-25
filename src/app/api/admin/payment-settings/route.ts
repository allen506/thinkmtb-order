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
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const rows = await query<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key LIKE 'payment_%' OR key = 'club_name'"
    );
    
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    
    return successResponse(settings);
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return errorResponse("Failed to fetch settings", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const body = await request.json();
    const allowed = [
      "payment_zelle",
      "payment_venmo",
      "payment_paypal",
      "payment_cash",
      "club_name",
    ];

    for (const key of allowed) {
      if (key in body) {
        await execute(
          "UPDATE app_settings SET value = ?, updated_at = NOW() WHERE key = ?",
          [body[key] ?? "", key]
        );
      }
    }

    return successResponse({ message: "Payment settings updated" });
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return errorResponse("Failed to update settings", 500);
  }
}
