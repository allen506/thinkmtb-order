import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

// GET SMTP settings
export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const settings = await queryOne<any>(
      "SELECT host, port, secure, username, from_email FROM smtp_settings WHERE id = 1"
    );

    if (!settings) {
      return successResponse({
        host: "",
        port: 587,
        secure: false,
        username: "",
        from_email: "",
      });
    }

    return successResponse(settings);
  } catch (error) {
    console.error("Error fetching SMTP settings:", error);
    return errorResponse("Failed to fetch settings", 500);
  }
}

// POST/PATCH SMTP settings
export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { host, port, secure, username, password, from_email } = await request.json();

    if (!host || !port || !username || !password || !from_email) {
      return errorResponse(
        "All SMTP fields are required",
        400
      );
    }

    const existing = await queryOne(
      "SELECT id FROM smtp_settings WHERE id = 1"
    );

    if (existing) {
      await execute(
        `UPDATE smtp_settings 
         SET host = ?, port = ?, secure = ?, username = ?, password = ?, from_email = ?, updated_at = NOW()
         WHERE id = 1`,
        [host, port, secure ? 1 : 0, username, password, from_email]
      );
    } else {
      await execute(
        `INSERT INTO smtp_settings (id, host, port, secure, username, password, from_email, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, NOW())`,
        [host, port, secure ? 1 : 0, username, password, from_email]
      );
    }

    return successResponse({ message: "SMTP settings saved successfully" });
  } catch (error) {
    console.error("Error saving SMTP settings:", error);
    return errorResponse("Failed to save settings", 500);
  }
}
