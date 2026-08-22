import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "final-designs");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, name, description, image_url, sort_order, created_at
         FROM final_designs ORDER BY sort_order ASC, created_at ASC`
      )
      .all();
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/final-designs error:", err);
    return NextResponse.json({ error: "Failed to load designs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim() ?? "";

    if (!file || !name) {
      return NextResponse.json({ error: "name and file are required" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
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

    const db = getDb();
    const maxOrder = (
      db.prepare("SELECT MAX(sort_order) as m FROM final_designs").get() as { m: number | null }
    ).m ?? 0;

    const result = db
      .prepare(
        `INSERT INTO final_designs (name, description, image_url, sort_order) VALUES (?, ?, ?, ?)`
      )
      .run(name, description, imageUrl, maxOrder + 1);

    const inserted = db
      .prepare("SELECT * FROM final_designs WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error("POST /api/final-designs error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
