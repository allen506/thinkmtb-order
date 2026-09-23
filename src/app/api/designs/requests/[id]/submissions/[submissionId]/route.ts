import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const { id, submissionId } = await params;

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

    // Get submission with files
    const submission = db
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
      WHERE ds.id = ? AND ds.request_id = ?
    `
      )
      .get(submissionId, id) as any;

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Get files
    const files = db
      .prepare(
        `
      SELECT id, file_url, file_name, file_type, created_at
      FROM design_submission_files
      WHERE submission_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(submissionId);

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        files,
      },
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const { id, submissionId } = await params;

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

    // Get design request
    const designRequest = db
      .prepare("SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?")
      .get(id, tenant.id) as any;

    if (!designRequest) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Only team captain or admin can approve/reject
    if (userRole !== "admin" && designRequest.requester_id !== userId) {
      return NextResponse.json(
        { error: "Only the team captain or admin can approve/reject designs" },
        { status: 403 }
      );
    }

    const { status, notes } = await request.json();

    if (!["approved", "rejected", "pending_review"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be approved, rejected, or pending_review" },
        { status: 400 }
      );
    }

    // Update submission status
    const result = db
      .prepare(
        `
      UPDATE design_submissions 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ? AND request_id = ?
    `
      )
      .run(status, submissionId, id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to update submission" },
        { status: 500 }
      );
    }

    // If approved, update design request and set approved_submission_id
    if (status === "approved") {
      db.prepare(
        "UPDATE design_requests SET status = ?, approved_submission_id = ? WHERE id = ?"
      ).run("approved", submissionId, id);
    }

    // If rejected, keep request in in_design status
    if (status === "rejected") {
      db.prepare(
        "UPDATE design_requests SET status = ? WHERE id = ?"
      ).run("in_design", id);
    }

    return NextResponse.json({
      success: true,
      message: `Design submission ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
