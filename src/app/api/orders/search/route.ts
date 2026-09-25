import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  errorResponse,
  successResponse,
  extractContext,
} from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");
    const context = extractContext(request);

    if (!name) {
      return errorResponse("Name is required", 400);
    }

    // Get tenant ID from slug
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [context.tenantSlug]
    );
    const tenantId = tenant?.id || "default-tenant";

    const orders = await query<any>(
      `SELECT * FROM orders WHERE user_name ILIKE ? AND tenant_id = ? ORDER BY created_at DESC`,
      [`%${name}%`, tenantId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await query<any>(
          `SELECT oi.*, pt.name as product_name, d.name as design_name, s.name as size_name
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = ?
           ORDER BY pt.sort_order, d.sort_order, s.sort_order`,
          [order.id]
        ),
      }))
    );

    return successResponse({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error searching orders:", error);
    return errorResponse("Failed to search orders", 500);
  }
}
