import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// PATCH — reset a user's PIN by providing their full name
export async function PATCH(request: NextRequest) {
  const { name, newPin } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const db = getDb();
  const profile = db.prepare("SELECT pin, full_name FROM user_profiles WHERE LOWER(full_name) = LOWER(?)").get(name.trim()) as { pin: string; full_name: string } | undefined;

  if (!profile) {
    return NextResponse.json({ error: "No account found with that name" }, { status: 404 });
  }

  // Check PIN isn't already taken by someone else
  const taken = db.prepare("SELECT pin FROM user_profiles WHERE pin = ? AND LOWER(full_name) != LOWER(?)").get(newPin, name.trim());
  if (taken) {
    return NextResponse.json({ error: "That PIN is already in use — choose a different one" }, { status: 409 });
  }

  db.transaction(() => {
    // Move profile to new PIN (PIN is the primary key so insert+delete)
    db.prepare("INSERT OR REPLACE INTO user_profiles (pin, full_name, created_at) VALUES (?, ?, ?)").run(newPin, profile.full_name, new Date().toISOString());
    if (profile.pin !== newPin) {
      db.prepare("DELETE FROM user_profiles WHERE pin = ?").run(profile.pin);
    }
  })();

  return NextResponse.json({ pin: newPin, fullName: profile.full_name });
}
