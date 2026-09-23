import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

    // Get submissions with their files
    const submissions = db
      .prepare(
        `
      SELECT 
        ds.id,
        ds.request_id,
        ds.designer_id,
        ds.submission_number,
        ds.status,
        ds.notes,
        ds.created_at,
        ds.updated_at,
        ua.email as designer_email
      FROM design_submissions ds
      LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
      WHERE ds.request_id = ?
      ORDER BY ds.submission_number DESC
    `
      )
      .all(id);

    // Get files for each submission
    const submissionsWithFiles = (submissions as any[]).map((submission) => {
      const files = db
        .prepare(
          `
        SELECT id, file_url, file_name, file_type, created_at
        FROM design_submission_files
        WHERE submission_id = ?
        ORDER BY created_at DESC
      `
        )
        .all(submission.id);

      return {
        ...submission,
        files,
      };
    });

    return NextResponse.json({
      success: true,
      submissions: submissionsWithFiles,
      count: submissionsWithFiles.length,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - user ID required" },
        { status: 401 }
      );
    }

    if (userRole !== "designer") {
      return NextResponse.json(
        { error: "Only designers can submit designs" },
        { status: 403 }
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

    // Get next submission number
    const lastSubmission = db
      .prepare(
        "SELECT submission_number FROM design_submissions WHERE request_id = ? ORDER BY submission_number DESC LIMIT 1"
      )
      .get(id) as { submission_number: number } | undefined;

    const submissionNumber = (lastSubmission?.submission_number || 0) + 1;

    const { notes } = await request.json();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const submissionId = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create submission record
    const result = db
      .prepare(
        `
      INSERT INTO design_submissions 
        (id, request_id, designer_id, submission_number, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
      )
      .run(submissionId, id, userId, submissionNumber, "pending_review", notes || "");

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to create submission" },
        { status: 500 }
      );
    }

    // Upload submission files
    const uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileId = `dsf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileName = file.name;
        const fileType = file.type;
        const fileUrl = `/uploads/design-submissions/${submissionId}/${fileName}`;

        const fileResult = db
          .prepare(
            `
          INSERT INTO design_submission_files 
            (id, submission_id, file_url, file_name, file_type, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `
          )
          .run(fileId, submissionId, fileUrl, fileName, fileType);

        if (fileResult.changes > 0) {
          uploadedFiles.push({
            fileId,
            fileName,
            fileType,
            fileUrl,
          });
        }
      }
    }

    // Update request status to 'in_design' if it's still pending
    if (designRequest.status === "pending") {
      db.prepare("UPDATE design_requests SET status = ? WHERE id = ?").run(
        "in_design",
        id
      );
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        submissionNumber,
        uploadedFiles,
        message: "Design submission created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
