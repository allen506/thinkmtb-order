import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  extractContext,
  requireAuth,
} from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Get design request with access control
    const designRequest = await queryOne<any>(
      `SELECT dr.*, ua.email as requester_email, t.name as team_name
       FROM design_requests dr
       LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
       LEFT JOIN teams t ON t.id = dr.team_id
       WHERE dr.id = ? AND dr.tenant_id = ?`,
      [id, tenant.id]
    );

    if (!designRequest) {
      return errorResponse("Design request not found", 404);
    }

    // Check access: requester, team member, or admin
    const user = await queryOne<{ user_role: string; team_id: string }>(
      "SELECT user_role, team_id FROM user_accounts WHERE id = ?",
      [ctx.userId]
    );

    if (
      user?.user_role !== "admin" &&
      designRequest.requester_id !== ctx.userId &&
      user?.team_id !== designRequest.team_id
    ) {
      return errorResponse("Access denied to this design request", 403);
    }

    // Get attached files
    const files = await query<any>(
      `SELECT id, file_url, file_name, file_type, uploaded_by, created_at
       FROM design_request_files
       WHERE request_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    // Get design submissions
    const submissions = await query<any>(
      `SELECT ds.id, ds.request_id, ds.designer_id, ds.submission_number, ds.status,
        ds.created_at, ds.updated_at, ua.email as designer_email,
        COUNT(DISTINCT dsf.id) as file_count
       FROM design_submissions ds
       LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
       LEFT JOIN design_submission_files dsf ON dsf.submission_id = ds.id
       WHERE ds.request_id = ?
       GROUP BY ds.id
       ORDER BY ds.submission_number DESC`,
      [id]
    );

    // Get comments thread
    const comments = await query<any>(
      `SELECT dc.id, dc.request_id, dc.user_id, dc.comment, dc.created_at,
        ua.email as user_email
       FROM design_comments dc
       LEFT JOIN user_accounts ua ON ua.id = dc.user_id
       WHERE dc.request_id = ?
       ORDER BY dc.created_at ASC`,
      [id]
    );

    return successResponse({
      success: true,
      request: designRequest,
      files,
      submissions,
      comments,
    });
  } catch (error) {
    console.error("Error fetching design request:", error);
    return errorResponse("Failed to fetch design request", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Verify request exists and belongs to tenant
    const designRequest = await queryOne<any>(
      "SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );

    if (!designRequest) {
      return errorResponse("Design request not found", 404);
    }

    // Only requester or admin can update
    if (ctx.userRole !== "admin" && designRequest.requester_id !== ctx.userId) {
      return errorResponse(
        "Only the requester or admin can update this request",
        403
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
    if (status !== undefined && ctx.userRole === "admin") {
      // Only admin can change status
      updates.push("status = ?");
      values.push(status);
    }

    if (updates.length === 0) {
      return errorResponse("No fields to update", 400);
    }

    updates.push("updated_at = NOW()");
    values.push(id);
    values.push(tenant.id);

    await execute(
      `UPDATE design_requests SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values
    );

    return successResponse({
      success: true,
      message: "Design request updated successfully",
    });
  } catch (error) {
    console.error("Error updating design request:", error);
    return errorResponse("Failed to update design request", 500);
  }
}
