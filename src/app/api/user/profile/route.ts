import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/user/profile?pin=1234
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin");
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  const db = getDb();
  const profile = db
    .prepare("SELECT pin, full_name FROM user_profiles WHERE pin = ?")
    .get(pin) as { pin: string; full_name: string } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "PIN not found" }, { status: 404 });
  }

  return NextResponse.json({ pin: profile.pin, fullName: profile.full_name });
}

// POST /api/user/profile — create a new profile
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pin, fullName } = body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT pin FROM user_profiles WHERE pin = ?").get(pin);
  if (existing) {
    return NextResponse.json({ error: "PIN already taken — choose a different one" }, { status: 409 });
  }

  db.prepare("INSERT INTO user_profiles (pin, full_name) VALUES (?, ?)").run(pin, fullName.trim());
  return NextResponse.json({ pin, fullName: fullName.trim() }, { status: 201 });
}
