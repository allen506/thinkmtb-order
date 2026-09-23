import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - user ID required" },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Verify request exists
    const designRequest = db
      .prepare("SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?")
      .get(id, tenant.id) as any;

    if (!designRequest) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Only requester can upload to their request
    if (designRequest.requester_id !== userId) {
      return NextResponse.json(
        { error: "Only the requester can upload files" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // In production, upload to cloud storage (S3, etc)
      // For now, store file metadata only
      const fileId = `df_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = file.name;
      const fileType = file.type;
      const fileUrl = `/uploads/design-requests/${id}/${fileName}`;

      const result = db
        .prepare(
          `
        INSERT INTO design_request_files 
          (id, request_id, file_url, file_name, file_type, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
        )
        .run(fileId, id, fileUrl, fileName, fileType, userId);

      if (result.changes > 0) {
        uploadedFiles.push({
          fileId,
          fileName,
          fileType,
          fileUrl,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload files" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - user ID required" },
        { status: 401 }
      );
    }

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get files
    const files = db
      .prepare(
        `
      SELECT 
        id,
        file_url,
        file_name,
        file_type,
        uploaded_by,
        created_at
      FROM design_request_files
      WHERE request_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(id);

    return NextResponse.json({
      success: true,
      files,
      count: (files as any[]).length,
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
