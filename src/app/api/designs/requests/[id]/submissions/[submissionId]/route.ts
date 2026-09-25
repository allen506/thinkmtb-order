import { NextRequest } from "next/server";
import {
  queryOne,
  query,
  execute,
  errorResponse,
  successResponse,
  extractContext,
  requireAuth,
} from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id, submissionId } = await params;

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

    // Get submission with files
    const submission = await queryOne<any>(
      `SELECT ds.id, ds.request_id, ds.designer_id, ds.submission_number,
        ds.status, ds.notes, ds.created_at, ds.updated_at,
        ua.email as designer_email
       FROM design_submissions ds
       LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
       WHERE ds.id = ? AND ds.request_id = ?`,
      [submissionId, id]
    );

    if (!submission) {
      return errorResponse("Submission not found", 404);
    }

    // Get files
    const files = await query<any>(
      `SELECT id, file_url, file_name, file_type, created_at
       FROM design_submission_files
       WHERE submission_id = ?
       ORDER BY created_at DESC`,
      [submissionId]
    );

    return successResponse({
      success: true,
      submission: {
        ...submission,
        files,
      },
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return errorResponse("Failed to fetch submission", 500);
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id, submissionId } = await params;

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

    // Get design request
    const designRequest = await queryOne<any>(
      "SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );

    if (!designRequest) {
      return errorResponse("Design request not found", 404);
    }

    // Only team captain or admin can approve/reject
    if (ctx.userRole !== "admin" && designRequest.requester_id !== ctx.userId) {
      return errorResponse(
        "Only the team captain or admin can approve/reject designs",
        403
      );
    }

    const { status, notes } = await request.json();

    if (!["approved", "rejected", "pending_review"].includes(status)) {
      return errorResponse(
        "Invalid status. Must be approved, rejected, or pending_review",
        400
      );
    }

    // Update submission status
    await execute(
      `UPDATE design_submissions SET status = ?, updated_at = NOW()
       WHERE id = ? AND request_id = ?`,
      [status, submissionId, id]
    );

    // If approved, update design request and set approved_submission_id
    if (status === "approved") {
      await execute(
        "UPDATE design_requests SET status = ?, approved_submission_id = ?, updated_at = NOW() WHERE id = ?",
        ["approved", submissionId, id]
      );
    }

    // If rejected, keep request in in_design status
    if (status === "rejected") {
      await execute(
        "UPDATE design_requests SET status = ?, updated_at = NOW() WHERE id = ?",
        ["in_design", id]
      );
    }

    return successResponse({
      success: true,
      message: `Design submission ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return errorResponse("Failed to update submission", 500);
  }
}
