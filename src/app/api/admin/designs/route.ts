import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();
const UPLOAD_DIR = path.join(process.cwd(), "public/designs");

// Ensure upload directory exists
mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const designs = db
      .prepare(
        `
      SELECT 
        id, 
        name, 
        description,
        image_url,
        active, 
        sort_order,
        designed_for,
        created_at
      FROM designs
      ORDER BY sort_order ASC
    `
      )
      .all();

    return NextResponse.json({ designs });
  } catch (error) {
    console.error("Error fetching designs:", error);
    return NextResponse.json(
      { error: "Failed to fetch designs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const active = formData.get("active") === "true" ? 1 : 0;
    const sort_order = parseInt(formData.get("sort_order") as string) || 999;
    const designed_for = formData.get("designed_for") as string;
    const file = formData.get("file") as File | null;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    let image_url = "";

    // Handle file upload if provided
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Max 5MB." },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const filename = `design-${timestamp}-${name.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}.${file.type.split("/")[1]}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      writeFileSync(filepath, Buffer.from(buffer));
      image_url = `/designs/${filename}`;
    }

    const id = `design-${Date.now()}`;
    const now = new Date().toISOString().split("T")[0];

    db.prepare(
      `
      INSERT INTO designs (id, name, description, image_url, active, sort_order, designed_for, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      name,
      description || null,
      image_url || null,
      active,
      sort_order,
      designed_for || null,
      now
    );

    return NextResponse.json(
      { id, image_url, message: "Design created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating design:", error);
    return NextResponse.json(
      { error: "Failed to create design" },
      { status: 500 }
    );
  }
}
