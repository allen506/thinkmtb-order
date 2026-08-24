import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  
  try {
    const db = getDb();
    
    const settings = db
      .prepare(`SELECT key, value FROM app_settings`)
      .all() as { key: string; value: string }[];
    
    const result: Record<string, any> = {};
    settings.forEach(({ key, value }) => {
      // Try to parse as number if it looks like one
      if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else if (value === "0" || value === "1") {
        result[key] = value === "1" ? 1 : 0;
      } else {
        result[key] = value;
      }
    });
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch app settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  
  try {
    const body = await request.json();
    const db = getDb();
    
    for (const [key, value] of Object.entries(body)) {
      db.prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?) 
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(key, String(value));
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
