import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { getClientIp, checkRateLimit, recordFailedAttempt, recordSuccessfulLogin } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  
  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        valid: false,
        error: `Too many failed attempts. Try again in ${Math.ceil((rateLimit.resetTime!.getTime() - Date.now()) / 60000)} minutes.`,
      },
      { status: 429 }
    );
  }

  const { password } = await request.json();
  if (!password) {
    recordFailedAttempt(ip);
    return NextResponse.json({ valid: false });
  }

  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  if (row?.value !== password) {
    recordFailedAttempt(ip);
    return NextResponse.json({ valid: false });
  }

  // Valid — create a 24h session token and set httpOnly cookie
  recordSuccessfulLogin(ip); // Clear rate limit on success
  const token = randomUUID();
  db.prepare("INSERT INTO admin_sessions (token) VALUES (?)").run(token);
  // Clean up expired sessions opportunistically
  db.prepare("DELETE FROM admin_sessions WHERE expires_at < datetime('now')").run();

  const response = NextResponse.json({ valid: true });
  response.cookies.set("admin-session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}
