import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

// DELETE admin email
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { id } = await params;
    const db = getDb();

    const email = db.prepare("SELECT email FROM admin_emails WHERE id = ?").get(id) as { email: string } | undefined;

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM admin_emails WHERE id = ?").run(id);

    return NextResponse.json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin email:", error);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
