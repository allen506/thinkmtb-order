import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function GET() {
  try {
    const db = getDb();
    const result = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'ordering_active'`)
      .get() as { value: string } | undefined;

    const orderingActive = result ? result.value === "1" : true;

    return NextResponse.json({ orderingActive });
  } catch (error) {
    console.error("Error fetching ordering status:", error);
    return NextResponse.json(
      { error: "Failed to fetch ordering status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const body = await request.json();
    const { orderingActive } = body;

    if (typeof orderingActive !== "boolean") {
      return NextResponse.json(
        { error: "orderingActive must be a boolean" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'ordering_active'`
    ).run(orderingActive ? "1" : "0");

    return NextResponse.json({ orderingActive, success: true });
  } catch (error) {
    console.error("Error updating ordering status:", error);
    return NextResponse.json(
      { error: "Failed to update ordering status" },
      { status: 500 }
    );
  }
}
