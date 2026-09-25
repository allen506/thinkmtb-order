import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
  withTransaction,
} from "@/lib/route-helpers";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return errorResponse(authError.error, 401);

  try {
    // Get retention days setting (default 365 days = 1 year)
    const retentionSetting = await queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'archive_retention_days'`,
      []
    );
    const retentionDays = parseInt(retentionSetting?.value || "365", 10);

    // Get all current orders with items for archiving
    const orders = await query<any>(
      `SELECT o.id, o.user_name, o.status, o.created_at,
        json_agg(json_build_object(
          'id', oi.id,
          'product_type_id', oi.product_type_id,
          'product_name', pt.name,
          'design_id', oi.design_id,
          'design_name', d.name,
          'size_id', oi.size_id,
          'size_name', s.name,
          'quantity', oi.quantity,
          'fit', oi.fit,
          'sleeve_length', oi.sleeve_length,
          'unit_price_crc', oi.unit_price_crc,
          'unit_price_usd', oi.unit_price_usd
        )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN product_types pt ON oi.product_type_id = pt.id
       LEFT JOIN designs d ON oi.design_id = d.id
       LEFT JOIN sizes s ON oi.size_id = s.id
       GROUP BY o.id
       ORDER BY o.created_at`,
      []
    );

    // Get summary data
    const stats = await queryOne<{
      total_orders: number;
      total_items: number;
    }>(
      `SELECT COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id`,
      []
    );

    const { compra: exchangeRate } = await getExchangeRate();

    // Calculate total revenue
    let totalRevenueUSD = 0;
    orders.forEach((order) => {
      const items = order.items || [];
      items.forEach((item: any) => {
        if (item.unit_price_usd) {
          totalRevenueUSD += item.unit_price_usd * item.quantity;
        }
      });
    });

    // Get next campaign number
    const lastArchive = await queryOne<{ max_num: number | null }>(
      `SELECT MAX(campaign_number) as max_num FROM archived_campaigns`,
      []
    );
    const nextCampaignNumber = (lastArchive?.max_num || 0) + 1;

    const campaignName = `Campaign #${nextCampaignNumber}`;
    const now = new Date();
    const deleteAt = new Date(
      now.getTime() + retentionDays * 24 * 60 * 60 * 1000
    );

    // Execute in transaction
    await withTransaction(async () => {
      // Archive current data
      const archiveId = uuidv4();
      await execute(
        `INSERT INTO archived_campaigns
         (id, campaign_name, campaign_number, orders_snapshot, summary_snapshot, total_orders, total_items, total_revenue_usd, delete_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          archiveId,
          campaignName,
          nextCampaignNumber,
          JSON.stringify(orders),
          JSON.stringify(stats),
          stats?.total_orders || 0,
          stats?.total_items || 0,
          totalRevenueUSD,
          deleteAt.toISOString(),
        ]
      );

      // Clean up expired archives
      await execute(
        `DELETE FROM archived_campaigns WHERE delete_at < NOW()`,
        []
      );

      // Delete current data in order: payments → order_items → orders
      await execute(`DELETE FROM order_items`, []);
      await execute(`DELETE FROM payments`, []);
      await execute(`DELETE FROM orders`, []);

      // Reset ordering_active to true (enabled) for the new campaign
      await execute(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('ordering_active', '1', NOW())
         ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = NOW()`,
        []
      );
    });

    return successResponse({
      success: true,
      message: `${campaignName} archived successfully. Starting fresh campaign.`,
      campaignId: nextCampaignNumber,
      campaignName,
      ordersArchived: stats?.total_orders || 0,
      itemsArchived: stats?.total_items || 0,
      archiveRetentionDays: retentionDays,
    });
  } catch (error) {
    console.error("Error starting new campaign:", error);
    return errorResponse("Failed to start new campaign", 500);
  }
}
