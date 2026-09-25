import { NextRequest, NextResponse } from "next/server";
import { query, execute, errorResponse, successResponse } from "@/lib/route-helpers";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "final-designs");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export async function GET() {
  try {
    const rows = await query<any>(
      `SELECT id, name, description, image_url, sort_order, created_at
       FROM final_designs ORDER BY sort_order ASC, created_at ASC`,
      []
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/final-designs error:", err);
    return errorResponse("Failed to load designs", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim() ?? "";

    if (!file || !name) {
      return errorResponse("name and file are required", 400);
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return errorResponse("Only JPEG, PNG, WebP, or GIF images are allowed", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File must be under 10 MB", 400);
    }

    // Ensure upload dir exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const safeName = `${Date.now()}_${sanitizeFilename(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/final-designs/${safeName}`;
    const designId = uuidv4();

    await execute(
      `INSERT INTO final_designs (id, name, description, image_url, sort_order, created_at)
       VALUES (?, ?, ?, ?, (COALESCE((SELECT MAX(sort_order) FROM final_designs), 0) + 1), NOW())`,
      [designId, name, description, imageUrl]
    );

    const inserted = await query<any>(
      "SELECT * FROM final_designs WHERE id = ?",
      [designId]
    );

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/final-designs error:", err);
    return errorResponse("Upload failed", 500);
  }
}
