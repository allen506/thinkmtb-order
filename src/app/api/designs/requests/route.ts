import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - user ID required" },
        { status: 401 }
      );
    }

    // Get tenant ID from slug
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let query = `
      SELECT 
        dr.id,
        dr.title,
        dr.description,
        dr.status,
        dr.requester_id,
        dr.team_id,
        dr.created_at,
        dr.updated_at,
        COUNT(DISTINCT drf.id) as file_count,
        COUNT(DISTINCT ds.id) as submission_count,
        ua.email as requester_email
      FROM design_requests dr
      LEFT JOIN design_request_files drf ON drf.request_id = dr.id
      LEFT JOIN design_submissions ds ON ds.request_id = dr.id
      LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
      WHERE dr.tenant_id = ?
    `;

    const params: any[] = [tenant.id];

    // Filter by role:
    // - Regular users see only their own requests
    // - Team captains see requests from their team
    // - Admins see all
    if (userRole !== "admin") {
      query += ` AND (dr.requester_id = ? OR dr.team_id IN (
        SELECT team_id FROM user_accounts WHERE id = ?
      ))`;
      params.push(userId, userId);
    }

    query += ` GROUP BY dr.id ORDER BY dr.created_at DESC`;

    const requests = db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      requests,
      count: (requests as any[]).length,
    });
  } catch (error) {
    console.error("Error fetching design requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch design requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");

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

    // Verify user is team captain
    const user = db
      .prepare("SELECT is_team_captain, team_id FROM user_accounts WHERE id = ?")
      .get(userId) as { is_team_captain: number; team_id: string } | undefined;

    if (!user || !user.is_team_captain) {
      return NextResponse.json(
        { error: "Only team captains can request designs" },
        { status: 403 }
      );
    }

    const { title, description } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const id = `dr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = db
      .prepare(
        `
      INSERT INTO design_requests 
        (id, tenant_id, title, description, requester_id, team_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
      )
      .run(
        id,
        tenant.id,
        title,
        description,
        userId,
        user.team_id,
        "pending"
      );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to create design request" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requestId: id,
        message: "Design request created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating design request:", error);
    return NextResponse.json(
      { error: "Failed to create design request" },
      { status: 500 }
    );
  }
}
