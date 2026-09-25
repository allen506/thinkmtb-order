import { NextRequest } from "next/server";
import {
  query,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    const archives = await query<any>(
      `SELECT 
        id,
        campaign_name,
        campaign_number,
        archived_at,
        total_orders,
        total_items,
        total_revenue_usd,
        delete_at,
        created_at
      FROM archived_campaigns
      ORDER BY campaign_number DESC`,
      []
    );

    return successResponse({
      success: true,
      archives,
      count: archives.length,
    });
  } catch (error) {
    console.error("Error fetching archived campaigns:", error);
    return errorResponse("Failed to fetch archived campaigns", 500);
  }
}
