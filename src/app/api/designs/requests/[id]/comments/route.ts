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

    // Verify user has access (requester or team member)
    const user = db
      .prepare(
        "SELECT team_id, user_role FROM user_accounts WHERE id = ?"
      )
      .get(userId) as { team_id: string; user_role: string } | undefined;

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

    const { comment } = await request.json();

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    const commentId = `dc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = db
      .prepare(
        `
      INSERT INTO design_comments 
        (id, request_id, user_id, comment, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `
      )
      .run(commentId, id, userId, comment);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        commentId,
        message: "Comment added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
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

    // Get comments with access control
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
      comments,
      count: (comments as any[]).length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
