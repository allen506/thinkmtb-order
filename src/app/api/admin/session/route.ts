import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("admin-session")?.value;
  if (token) {
    const db = getDb();
    db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
  }
  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("admin-session", "", { maxAge: 0, path: "/" });
  return response;
}
