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

    // Get design request with access control
    const designRequest = db
      .prepare(
        `
      SELECT dr.*, ua.email as requester_email, t.name as team_name
      FROM design_requests dr
      LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
      LEFT JOIN teams t ON t.id = dr.team_id
      WHERE dr.id = ? AND dr.tenant_id = ?
    `
      )
      .get(id, tenant.id) as any;

    if (!designRequest) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Check access: requester, team member, or admin
    const user = db
      .prepare("SELECT user_role, team_id FROM user_accounts WHERE id = ?")
      .get(userId) as { user_role: string; team_id: string } | undefined;

    if (
      user?.user_role !== "admin" &&
      designRequest.requester_id !== userId &&
      user?.team_id !== designRequest.team_id
    ) {
      return NextResponse.json(
        { error: "Access denied to this design request" },
        { status: 403 }
      );
    }

    // Get attached files
    const files = db
      .prepare(
        `
      SELECT id, file_url, file_name, file_type, uploaded_by, created_at
      FROM design_request_files
      WHERE request_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(id);

    // Get design submissions
    const submissions = db
      .prepare(
        `
      SELECT 
        ds.id,
        ds.request_id,
        ds.designer_id,
        ds.submission_number,
        ds.status,
        ds.created_at,
        ds.updated_at,
        ua.email as designer_email,
        COUNT(DISTINCT dsf.id) as file_count
      FROM design_submissions ds
      LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
      LEFT JOIN design_submission_files dsf ON dsf.submission_id = ds.id
      WHERE ds.request_id = ?
      GROUP BY ds.id
      ORDER BY ds.submission_number DESC
    `
      )
      .all(id);

    // Get comments thread
    const comments = db
      .prepare(
        `
      SELECT 
        dc.id,
        dc.request_id,
        dc.user_id,
        dc.comment,
        dc.created_at,
        ua.email as user_email
      FROM design_comments dc
      LEFT JOIN user_accounts ua ON ua.id = dc.user_id
      WHERE dc.request_id = ?
      ORDER BY dc.created_at ASC
    `
      )
      .all(id);

    return NextResponse.json({
      success: true,
      request: designRequest,
      files,
      submissions,
      comments,
    });
  } catch (error) {
    console.error("Error fetching design request:", error);
    return NextResponse.json(
      { error: "Failed to fetch design request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Verify request exists and belongs to tenant
    const designRequest = db
      .prepare("SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?")
      .get(id, tenant.id) as any;

    if (!designRequest) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Only requester or admin can update
    if (
      userRole !== "admin" &&
      designRequest.requester_id !== userId
    ) {
      return NextResponse.json(
        { error: "Only the requester or admin can update this request" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (status !== undefined && userRole === "admin") {
      // Only admin can change status
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(id, tenant.id);

    const result = db
      .prepare(
        `UPDATE design_requests SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
      )
      .run(...values);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to update design request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Design request updated successfully",
    });
  } catch (error) {
    console.error("Error updating design request:", error);
    return NextResponse.json(
      { error: "Failed to update design request" },
      { status: 500 }
    );
  }
}
