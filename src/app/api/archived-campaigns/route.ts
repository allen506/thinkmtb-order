import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  
  try {
    const db = getDb();

    const archives = db
      .prepare(
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
        ORDER BY campaign_number DESC`
      )
      .all();

    return NextResponse.json({
      success: true,
      archives,
      count: archives.length,
    });
  } catch (error) {
    console.error("Error fetching archived campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived campaigns" },
      { status: 500 }
    );
  }
}
