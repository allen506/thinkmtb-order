import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

// Simple in-memory rate limiter — max 10 attempts per IP per 5 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = attempts.get(ip) ?? { count: 0, resetAt: now + 5 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 5 * 60 * 1000; }
  if (entry.count >= 10) {
    attempts.set(ip, entry);
    return NextResponse.json({ valid: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }
  entry.count++;
  attempts.set(ip, entry);

  const { password } = await request.json();
  if (!password) return NextResponse.json({ valid: false });

  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  if (row?.value !== password) return NextResponse.json({ valid: false });

  // Valid — create a 24h session token and set httpOnly cookie
  const token = randomUUID();
  db.prepare("INSERT INTO admin_sessions (token) VALUES (?)").run(token);
  // Clean up expired sessions opportunistically
  db.prepare("DELETE FROM admin_sessions WHERE expires_at < datetime('now')").run();

  entry.count = 0; // reset on success
  const response = NextResponse.json({ valid: true });
  response.cookies.set("admin-session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}
