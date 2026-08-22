import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const idNum = parseInt(id);

    // Check if association exists
    const existing = db
      .prepare("SELECT id FROM product_designs WHERE id = ?")
      .get(idNum);

    if (!existing) {
      return NextResponse.json(
        { error: "Association not found" },
        { status: 404 }
      );
    }

    db.prepare("DELETE FROM product_designs WHERE id = ?").run(idNum);

    return NextResponse.json({
      message: "Association deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product-design association:", error);
    return NextResponse.json(
      { error: "Failed to delete association" },
      { status: 500 }
    );
  }
}
