import { NextRequest } from "next/server";
import {
  execute,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-session")?.value;
    
    if (token) {
      await execute("DELETE FROM admin_sessions WHERE token = ?", [token]);
    }
    
    const response = successResponse({ message: "Logged out" });
    // Client should clear cookie
    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    return errorResponse("Failed to logout", 500);
  }
}
