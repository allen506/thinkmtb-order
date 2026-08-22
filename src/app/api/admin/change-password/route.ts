import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isAdminAuthenticated(request)) return unauthorized();

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_password'").get() as { value: string } | undefined;

  if (row?.value !== currentPassword) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  db.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'admin_password'").run(newPassword);
  return NextResponse.json({ message: "Password updated successfully" });
}
