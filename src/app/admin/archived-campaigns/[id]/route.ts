import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated(request))) return unauthorized();

  try {
    const { id } = await params;
    const archiveId = parseInt(id, 10);

    const archive = await queryOne<{
      id: number;
      campaign_name: string;
      campaign_number: string;
      archived_at: string;
      orders_snapshot: string;
      summary_snapshot: string;
      total_orders: number;
      total_items: number;
      total_revenue_usd: number;
      delete_at: string | null;
      created_at: string;
    }>(
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
      WHERE id = $1`,
      [archiveId]
    );

    if (!archive) {
      return NextResponse.json(
        { error: "Archive not found" },
        { status: 404 }
      );
    }

    // Parse JSON snapshots
    const result = {
      ...archive,
      orders: JSON.parse(archive.orders_snapshot || "[]"),
      summary: JSON.parse(archive.summary_snapshot || "{}"),
    };
    delete (result as any).orders_snapshot;
    delete (result as any).summary_snapshot;

    return NextResponse.json({
      success: true,
      archive: result,
    });
  } catch (error) {
    console.error("Error fetching archived campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived campaign" },
      { status: 500 }
    );
  }
}
