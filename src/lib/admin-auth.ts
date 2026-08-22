import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Validates the admin session cookie. Returns true if authenticated. */
export function isAdminAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get("admin-session")?.value;
  if (!token) return false;
  const db = getDb();
  const session = db
    .prepare("SELECT token FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token);
  return !!session;
}

/** Standard 401 response for unauthenticated admin requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
