import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

/**
 * Admin endpoint for managing subdomain redirects
 * GET - list all redirects
 * POST - create/update a redirect
 * DELETE - remove a redirect
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const redirects = await query<any>(
      "SELECT * FROM subdomain_redirects ORDER BY subdomain ASC"
    );
    return successResponse({ success: true, redirects });
  } catch (error) {
    return errorResponse(
      `Failed to fetch redirects: ${String(error)}`,
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const body = await request.json();
    const { subdomain, redirect_url, is_team_portal, tenant_id, team_password } = body;

    if (!subdomain || !redirect_url) {
      return errorResponse(
        "Missing required fields: subdomain, redirect_url",
        400
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
      return errorResponse(
        "Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.",
        400
      );
    }

    // Don't allow reserved subdomains
    if (["www", "mail", "ftp", "ns", "admin", "cmsadmin"].includes(subdomain)) {
      return errorResponse("Reserved subdomain. Please choose a different name.", 400);
    }

    // If it's a team portal, make sure it has the required fields
    if (is_team_portal && !tenant_id) {
      return errorResponse("Team portals must have a tenant_id", 400);
    }

    // Check if subdomain already exists
    const existing = await queryOne(
      "SELECT id FROM subdomain_redirects WHERE subdomain = ?",
      [subdomain]
    );

    const id = existing?.id || uuidv4();

    if (existing) {
      await execute(
        `UPDATE subdomain_redirects 
         SET redirect_url = ?, is_team_portal = ?, tenant_id = ?, team_password = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          redirect_url,
          is_team_portal ? 1 : 0,
          tenant_id || null,
          team_password || null,
          id,
        ]
      );
    } else {
      await execute(
        `INSERT INTO subdomain_redirects (id, subdomain, redirect_url, is_team_portal, tenant_id, team_password, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          subdomain,
          redirect_url,
          is_team_portal ? 1 : 0,
          tenant_id || null,
          team_password || null,
        ]
      );
    }

    const redirect = await queryOne(
      "SELECT * FROM subdomain_redirects WHERE id = ?",
      [id]
    );

    return successResponse(
      {
        success: true,
        message: `Subdomain '${subdomain}' configured successfully`,
        redirect,
      },
      201
    );
  } catch (error) {
    return errorResponse(
      `Failed to create redirect: ${String(error)}`,
      500
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const body = await request.json();
    const { subdomain } = body;

    if (!subdomain) {
      return errorResponse("Subdomain is required", 400);
    }

    const redirect = await queryOne(
      "SELECT * FROM subdomain_redirects WHERE subdomain = ?",
      [subdomain]
    );

    if (!redirect) {
      return errorResponse(`Subdomain '${subdomain}' not found`, 404);
    }

    await execute(
      "DELETE FROM subdomain_redirects WHERE subdomain = ?",
      [subdomain]
    );

    return successResponse({
      success: true,
      message: `Subdomain '${subdomain}' deleted successfully`,
    });
  } catch (error) {
    return errorResponse(
      `Failed to delete redirect: ${String(error)}`,
      500
    );
  }
}
