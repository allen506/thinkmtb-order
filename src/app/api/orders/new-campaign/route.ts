import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const db = getDb();

    // Delete in order: payments → orders (foreign key constraint)
    db.prepare(`DELETE FROM payments`).run();
    db.prepare(`DELETE FROM orders`).run();

    // Reset the order counter back to 100
    db.prepare(`UPDATE order_number_seq SET next_val = 100 WHERE id = 1`).run();

    // Reset ordering_active to 1 (enabled) for the new campaign
    db.prepare(
      `UPDATE app_settings SET value = '1', updated_at = datetime('now') WHERE key = 'ordering_active'`
    ).run();

    return NextResponse.json({
      success: true,
      message: "New campaign started successfully. All previous orders have been cleared.",
    });
  } catch (error) {
    console.error("Error starting new campaign:", error);
    return NextResponse.json(
      { error: "Failed to start new campaign" },
      { status: 500 }
    );
  }
}
