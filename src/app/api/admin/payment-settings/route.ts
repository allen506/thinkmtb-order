import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'payment_%' OR key = 'club_name'").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isAdminAuthenticated(request)) return unauthorized();

  const body = await request.json();
  const db = getDb();
  const allowed = ["payment_zelle", "payment_venmo", "payment_paypal", "payment_cash", "club_name"];
  for (const key of allowed) {
    if (key in body) {
      db.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(body[key] ?? "", key);
    }
  }
  return NextResponse.json({ message: "Payment settings updated" });
}
