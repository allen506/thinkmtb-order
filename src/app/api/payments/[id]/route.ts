import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  const { id } = await params;
  const { status, adminNotes } = await request.json();

  const validStatuses = ["pending", "confirmed", "rejected"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  const payment = db.prepare("SELECT id, order_id FROM payments WHERE id = ?").get(id) as { id: number; order_id: string } | undefined;
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const updates: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];
  if (status) { updates.push("status = ?"); values.push(status); }
  if (adminNotes !== undefined) { updates.push("admin_notes = ?"); values.push(adminNotes); }
  values.push(Number(id));

  db.prepare(`UPDATE payments SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  // Auto-mark the order as paid when payment is confirmed
  if (status === "confirmed") {
    db.prepare("UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(payment.order_id);
  }

  return NextResponse.json({ message: "Payment updated" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
  return NextResponse.json({ message: "Payment deleted" });
}
