import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const db = getDb();

    // Get retention days setting (default 365 days = 1 year)
    const retentionSetting = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'archive_retention_days'`)
      .get() as { value: string } | undefined;
    const retentionDays = parseInt(retentionSetting?.value || "365", 10);

    // Get all current orders with items for archiving
    const orders = db
      .prepare(
        `SELECT 
          o.id, o.user_name, o.status, o.created_at,
          json_group_array(
            json_object(
              'id', oi.id,
              'product_type_id', oi.product_type_id,
              'product_name', (SELECT name FROM product_types WHERE id = oi.product_type_id),
              'design_id', oi.design_id,
              'design_name', (SELECT name FROM designs WHERE id = oi.design_id),
              'size_id', oi.size_id,
              'size_name', (SELECT name FROM sizes WHERE id = oi.size_id),
              'quantity', oi.quantity,
              'fit', oi.fit,
              'sleeve_length', oi.sleeve_length,
              'unit_price_crc', oi.unit_price_crc,
              'unit_price_usd', oi.unit_price_usd
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at`
      )
      .all() as any[];

    // Get summary data
    const stats = db
      .prepare(
        `SELECT 
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COALESCE(SUM(quantity), 0) FROM order_items) as total_items`
      )
      .get() as { total_orders: number; total_items: number };

    const { compra: exchangeRate } = await getExchangeRate();

    // Calculate total revenue
    let totalRevenueUSD = 0;
    orders.forEach((order) => {
      const items = JSON.parse(order.items || "[]");
      items.forEach((item: any) => {
        if (item.unit_price_usd) {
          totalRevenueUSD += item.unit_price_usd * item.quantity;
        }
      });
    });

    // Get next campaign number
    const lastArchive = db
      .prepare(`SELECT MAX(campaign_number) as max_num FROM archived_campaigns`)
      .get() as { max_num: number | null };
    const nextCampaignNumber = (lastArchive.max_num || 0) + 1;

    const campaignName = `Campaign #${nextCampaignNumber}`;
    const now = new Date();
    const deleteAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    // Archive current data
    db.prepare(
      `INSERT INTO archived_campaigns 
       (campaign_name, campaign_number, orders_snapshot, summary_snapshot, total_orders, total_items, total_revenue_usd, delete_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      campaignName,
      nextCampaignNumber,
      JSON.stringify(orders),
      JSON.stringify(stats),
      stats.total_orders,
      stats.total_items,
      totalRevenueUSD,
      deleteAt.toISOString()
    );

    // Clean up expired archives
    db.prepare(`DELETE FROM archived_campaigns WHERE delete_at < datetime('now')`).run();

    // Delete current data in order: payments → orders
    db.prepare(`DELETE FROM payments`).run();
    db.prepare(`DELETE FROM orders`).run();

    // Reset the order counter back to 100
    db.prepare(`UPDATE order_number_seq SET next_val = 100 WHERE id = 1`).run();

    // Reset ordering_active to 1 (enabled) for the new campaign
    db.prepare(
      `UPDATE app_settings SET value = '1', updated_at = datetime('now') WHERE key = 'ordering_active'`
    ).run();

    return NextResponse.json({
      success: true,
      message: `${campaignName} archived successfully. Starting fresh campaign.`,
      campaignId: nextCampaignNumber,
      campaignName,
      ordersArchived: stats.total_orders,
      itemsArchived: stats.total_items,
      archiveRetentionDays: retentionDays,
    });
  } catch (error) {
    console.error("Error starting new campaign:", error);
    return NextResponse.json(
      { error: "Failed to start new campaign" },
      { status: 500 }
    );
  }
}
