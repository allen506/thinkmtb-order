import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
    const { id } = await params;
    const db = getDb();
    const archiveId = parseInt(id, 10);

    const archive = db
      .prepare(
        `SELECT 
          id,
          campaign_name,
          campaign_number,
          archived_at,
          orders_snapshot,
          summary_snapshot,
          total_orders,
          total_items,
          total_revenue_usd,
          delete_at,
          created_at
        FROM archived_campaigns
        WHERE id = ?`
      )
      .get(archiveId) as any;

    if (!archive) {
      return NextResponse.json(
        { error: "Archive not found" },
        { status: 404 }
      );
    }

    // Parse JSON snapshots
    archive.orders = JSON.parse(archive.orders_snapshot || "[]");
    archive.summary = JSON.parse(archive.summary_snapshot || "{}");
    delete archive.orders_snapshot;
    delete archive.summary_snapshot;

    return NextResponse.json({
      success: true,
      archive,
    });
  } catch (error) {
    console.error("Error fetching archived campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived campaign" },
      { status: 500 }
    );
  }
}
