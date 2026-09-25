import { NextRequest } from "next/server";
import {
  query,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public/designs");

// Ensure upload directory exists
mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const designs = await query<any>(
      `SELECT 
        id, 
        name, 
        description,
        image_url,
        active, 
        sort_order,
        designed_for,
        created_at
      FROM designs
      ORDER BY sort_order ASC`
    );

    return successResponse({ designs });
  } catch (error) {
    console.error("Error fetching designs:", error);
    return errorResponse("Failed to fetch designs", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const active = formData.get("active") === "true" ? 1 : 0;
    const sort_order = parseInt(formData.get("sort_order") as string) || 999;
    const designed_for = formData.get("designed_for") as string;
    const file = formData.get("file") as File | null;

    if (!name) {
      return errorResponse("Name is required", 400);
    }

    let image_url = "";

    // Handle file upload if provided
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return errorResponse(
          "Invalid file type. Only JPEG, PNG, WebP, GIF allowed.",
          400
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return errorResponse("File too large. Max 5MB.", 400);
      }

      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const filename = `design-${timestamp}-${name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .substring(0, 20)}.${file.type.split("/")[1]}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      writeFileSync(filepath, Buffer.from(buffer));
      image_url = `/designs/${filename}`;
    }

    const id = uuidv4();

    await execute(
      `INSERT INTO designs (id, name, description, image_url, active, sort_order, designed_for, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        name,
        description || null,
        image_url || null,
        active,
        sort_order,
        designed_for || null,
      ]
    );

    return successResponse(
      { id, image_url, message: "Design created successfully" },
      201
    );
  } catch (error) {
    console.error("Error creating design:", error);
    return errorResponse("Failed to create design", 500);
  }
}
