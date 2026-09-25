import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, errorResponse, successResponse } from "@/lib/route-helpers";
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
      return errorResponse("name is required", 400);
    }

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM final_designs WHERE id = ?",
      [id]
    );
    if (!existing) {
      return errorResponse("Not found", 404);
    }

    await execute(
      "UPDATE final_designs SET name = ?, description = ?, updated_at = NOW() WHERE id = ?",
      [name, description, id]
    );

    const updated = await queryOne<any>(
      "SELECT * FROM final_designs WHERE id = ?",
      [id]
    );
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/final-designs/[id] error:", err);
    return errorResponse("Update failed", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await queryOne<{ image_url: string }>(
      "SELECT image_url FROM final_designs WHERE id = ?",
      [id]
    );

    if (!row) {
      return errorResponse("Not found", 404);
    }

    await execute("DELETE FROM final_designs WHERE id = ?", [id]);

    // Remove file from disk (only files inside our upload directory)
    const filename = path.basename(row.image_url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath) && filePath.startsWith(UPLOAD_DIR + path.sep)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/final-designs/[id] error:", err);
    return errorResponse("Delete failed", 500);
  }
}
