import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";

/** Validates the admin session cookie. Returns true if authenticated. */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin-session")?.value;
  if (!token) return false;
  
  try {
    const session = await queryOne(
      "SELECT token FROM admin_sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    return !!session;
  } catch (error) {
    console.error("Error checking admin session:", error);
    return false;
  }
}

/** Standard 401 response for unauthenticated admin requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
