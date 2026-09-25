import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  query,
  errorResponse,
  successResponse,
  extractContext,
  requireAuth,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function POST(
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

    // Verify request exists
    const designRequest = await queryOne<any>(
      "SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );

    if (!designRequest) {
      return errorResponse("Design request not found", 404);
    }

    // Verify user has access (requester or team member)
    const user = await queryOne<{ team_id: string; user_role: string }>(
      "SELECT team_id, user_role FROM user_accounts WHERE id = ?",
      [ctx.userId]
    );

    if (
      user?.user_role !== "admin" &&
      designRequest.requester_id !== ctx.userId &&
      user?.team_id !== designRequest.team_id
    ) {
      return errorResponse("Access denied to this design request", 403);
    }

    const { comment } = await request.json();

    if (!comment || comment.trim().length === 0) {
      return errorResponse("Comment cannot be empty", 400);
    }

    const commentId = uuidv4();

    await execute(
      `INSERT INTO design_comments (id, request_id, user_id, comment, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [commentId, id, ctx.userId, comment]
    );

    return successResponse(
      {
        success: true,
        commentId,
        message: "Comment added successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    return errorResponse("Failed to add comment", 500);
  }
}

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

    // Get comments with access control
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
      comments,
      count: comments.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return errorResponse("Failed to fetch comments", 500);
  }
}
