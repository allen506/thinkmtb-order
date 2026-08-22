import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "final-designs");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = body.name?.toString().trim();
    const description = (body.description ?? "").toString().trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM final_designs WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.prepare(
      "UPDATE final_designs SET name = ?, description = ? WHERE id = ?"
    ).run(name, description, id);

    const updated = db.prepare("SELECT * FROM final_designs WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/final-designs/[id] error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db
      .prepare("SELECT image_url FROM final_designs WHERE id = ?")
      .get(id) as { image_url: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM final_designs WHERE id = ?").run(id);

    // Remove file from disk (only files inside our upload directory)
    const filename = path.basename(row.image_url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath) && filePath.startsWith(UPLOAD_DIR + path.sep)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/final-designs/[id] error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
