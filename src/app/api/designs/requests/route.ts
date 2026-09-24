import { NextRequest, NextResponse } from "next/server";
import {
  query,
  queryOne,
  execute,
  extractContext,
  requireAuth,
  errorResponse,
  successResponse,
  withTransaction,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const ctx = extractContext(request);

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get tenant ID from slug
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    let sql = `
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
    if (ctx.userRole !== "admin") {
      sql += ` AND (dr.requester_id = ? OR dr.team_id IN (
        SELECT team_id FROM user_accounts WHERE id = ?
      ))`;
      params.push(ctx.userId, ctx.userId);
    }

    sql += ` GROUP BY dr.id ORDER BY dr.created_at DESC`;

    const requests = await query<any>(sql, params);

    return successResponse({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching design requests:", error);
    return errorResponse("Failed to fetch design requests", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extractContext(request);

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

    // Verify user is team captain
    const user = await queryOne<{
      is_team_captain: number;
      team_id: string;
    }>(
      "SELECT is_team_captain, team_id FROM user_accounts WHERE id = ? AND tenant_id = ?",
      [ctx.userId, tenant.id]
    );

    if (!user || !user.is_team_captain) {
      return errorResponse("Only team captains can request designs", 403);
    }

    const { title, description } = await request.json();

    if (!title || !description) {
      return errorResponse("Title and description are required", 400);
    }

    const id = uuidv4();

    const result = await execute(
      `
      INSERT INTO design_requests 
        (id, tenant_id, title, description, requester_id, team_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [id, tenant.id, title, description, ctx.userId, user.team_id, "pending"]
    );

    if (result.changes === 0) {
      return errorResponse("Failed to create design request", 500);
    }

    return successResponse(
      {
        success: true,
        requestId: id,
        message: "Design request created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating design request:", error);
    return errorResponse("Failed to create design request", 500);
  }
}
