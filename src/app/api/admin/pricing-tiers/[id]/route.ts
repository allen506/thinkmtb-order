import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const body = await req.json();
    const { min_qty, max_qty, price_crc } = body;

    // Check if tier exists
    const existing = db
      .prepare("SELECT id FROM pricing_tiers WHERE id = ?")
      .get(idNum);
    if (!existing) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    // Build update query
    const updates = [];
    const values = [];

    if (min_qty !== undefined) {
      updates.push("min_qty = ?");
      values.push(min_qty);
    }
    if (max_qty !== undefined) {
      updates.push("max_qty = ?");
      values.push(max_qty);
    }
    if (price_crc !== undefined) {
      updates.push("price_crc = ?");
      values.push(price_crc);
    }

    // Note: price_usd is NOT updated. It's calculated in real-time based on current exchange rate.

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(idNum);
    const query = `UPDATE pricing_tiers SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({ message: "Pricing tier updated successfully" });
  } catch (error) {
    console.error("Error updating pricing tier:", error);
    return NextResponse.json(
      { error: "Failed to update pricing tier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    db.prepare("DELETE FROM pricing_tiers WHERE id = ?").run(idNum);

    return NextResponse.json({
      message: "Pricing tier deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting pricing tier:", error);
    return NextResponse.json(
      { error: "Failed to delete pricing tier" },
      { status: 500 }
    );
  }
}
