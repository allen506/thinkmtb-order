import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

// GET SMTP settings
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const db = getDb();
    const settings = db.prepare("SELECT host, port, secure, username, from_email FROM smtp_settings WHERE id = 1").get();
    
    if (!settings) {
      return NextResponse.json({
        host: "",
        port: 587,
        secure: false,
        username: "",
        from_email: "",
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching SMTP settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST/PATCH SMTP settings
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { host, port, secure, username, password, from_email } = await request.json();

    if (!host || !port || !username || !password || !from_email) {
      return NextResponse.json(
        { error: "All SMTP fields are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM smtp_settings WHERE id = 1").get();

    if (existing) {
      db.prepare(`
        UPDATE smtp_settings 
        SET host = ?, port = ?, secure = ?, username = ?, password = ?, from_email = ?
        WHERE id = 1
      `).run(host, port, secure ? 1 : 0, username, password, from_email);
    } else {
      db.prepare(`
        INSERT INTO smtp_settings (id, host, port, secure, username, password, from_email)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `).run(host, port, secure ? 1 : 0, username, password, from_email);
    }

    return NextResponse.json({ message: "SMTP settings saved successfully" });
  } catch (error) {
    console.error("Error saving SMTP settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
