import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
  hashPassword,
  verifyPassword,
} from "@/lib/route-helpers";

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return errorResponse(
        "Both current and new password are required",
        400
      );
    }
    if (newPassword.length < 8) {
      return errorResponse("New password must be at least 8 characters", 400);
    }

    // For now, check against env var (TODO: use tenant_admins table)
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (!verifyPassword(currentPassword, adminPassword)) {
      return errorResponse("Current password is incorrect", 401);
    }

    const hashedPassword = hashPassword(newPassword);
    // TODO: Update tenant_admins table with new password
    // await execute("UPDATE tenant_admins SET password_hash = ? WHERE role = 'platform_admin'", [hashedPassword]);

    return successResponse({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return errorResponse("Failed to change password", 500);
  }
}
