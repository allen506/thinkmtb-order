import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designId } = await params;

    // Get design from database to find image URL
    const db = getDb();
    const design = db
      .prepare("SELECT image_url FROM designs WHERE id = ?")
      .get(designId) as { image_url: string } | undefined;

    if (!design || !design.image_url) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 }
      );
    }

    // Construct file path
    const filepath = path.join(process.cwd(), "public", design.image_url);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    // Read file and determine MIME type
    const fileBuffer = fs.readFileSync(filepath);
    const ext = path.extname(filepath).toLowerCase();
    let mimeType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") {
      mimeType = "image/jpeg";
    } else if (ext === ".gif") {
      mimeType = "image/gif";
    } else if (ext === ".webp") {
      mimeType = "image/webp";
    }

    // Serve file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving design image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
