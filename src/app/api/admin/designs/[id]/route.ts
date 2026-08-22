import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import path from "path";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();
const UPLOAD_DIR = path.join(process.cwd(), "public/designs");
mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const design = db
      .prepare("SELECT * FROM designs WHERE id = ?")
      .get(id);

    if (!design) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error("Error fetching design:", error);
    return NextResponse.json(
      { error: "Failed to fetch design" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const contentType = req.headers.get("content-type");
    let body: Record<string, any> = {};
    let file: File | null = null;

    // Handle both JSON and FormData
    if (contentType?.includes("application/json")) {
      body = await req.json();
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await req.formData();
      body.name = formData.get("name") as string;
      body.description = formData.get("description") as string;
      body.active = formData.get("active") === "true" ? 1 : 0;
      body.sort_order = formData.get("sort_order")
        ? parseInt(formData.get("sort_order") as string)
        : undefined;
      body.designed_for = formData.get("designed_for") as string;
      file = formData.get("file") as File | null;
    }

    // Check if design exists
    const existing = db.prepare("SELECT * FROM designs WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description || null);
    }
    if (body.active !== undefined) {
      updates.push("active = ?");
      values.push(body.active);
    }
    if (body.sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(body.sort_order);
    }
    if (body.designed_for !== undefined) {
      updates.push("designed_for = ?");
      values.push(body.designed_for || null);
    }

    // Handle file upload
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Max 5MB." },
          { status: 400 }
        );
      }

      // Delete old image if exists
      if (existing.image_url) {
        try {
          const oldFilepath = path.join(
            process.cwd(),
            "public",
            existing.image_url
          );
          unlinkSync(oldFilepath);
        } catch {
          // File may not exist
        }
      }

      // Save new image
      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const filename = `design-${timestamp}-${body.name?.toLowerCase().replace(/\s+/g, "-").substring(0, 20) || "unknown"}.${file.type.split("/")[1]}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      writeFileSync(filepath, Buffer.from(buffer));

      updates.push("image_url = ?");
      values.push(`/designs/${filename}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(id);
    const query = `UPDATE designs SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({ message: "Design updated successfully" });
  } catch (error) {
    console.error("Error updating design:", error);
    return NextResponse.json(
      { error: "Failed to update design" },
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

    // Check if design has orders
    const orders = db
      .prepare("SELECT COUNT(*) as count FROM order_items WHERE design_id = ?")
      .get(id) as { count: number };

    if (orders.count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete design with ${orders.count} existing orders`,
        },
        { status: 400 }
      );
    }

    // Get design to find image
    const design = db.prepare("SELECT image_url FROM designs WHERE id = ?").get(id) as any;

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Delete in a transaction: child records first, then the design
    db.transaction(() => {
      db.prepare("DELETE FROM product_designs WHERE design_id = ?").run(id);
      db.prepare("DELETE FROM designs WHERE id = ?").run(id);
    })();

    // Delete the image file after the DB transaction succeeds
    if (design.image_url) {
      try {
        const filepath = path.join(process.cwd(), "public", design.image_url);
        unlinkSync(filepath);
      } catch {
        // File may not exist or be in a different location — not fatal
      }
    }

    return NextResponse.json({ message: "Design deleted successfully" });
  } catch (error) {
    console.error("Error deleting design:", error);
    return NextResponse.json(
      { error: "Failed to delete design" },
      { status: 500 }
    );
  }
}
