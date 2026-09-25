import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  extractContext,
  requireAuth,
  withTransaction,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";
import { OrderFormData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const context = extractContext(request);
    
    // Get tenant ID from slug
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [context.tenantSlug]
    );
    const tenantId = tenant?.id || "default-tenant";

    const orders = await query<any>(
      `SELECT o.* FROM orders o
       WHERE o.status != 'cancelled' AND o.tenant_id = ?
       ORDER BY o.created_at DESC`,
      [tenantId]
    );

    const result = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await query<any>(
          `SELECT oi.id, oi.product_type_id, oi.design_id, oi.size_id, oi.sleeve_length, 
            COALESCE(oi.fit, '') as fit, oi.quantity,
            pt.name as product_name, d.name as design_name, s.name as size_name
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = ?`,
          [order.id]
        ),
      }))
    );

    return successResponse({ orders: result });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = extractContext(request);
    const body: OrderFormData = await request.json();

    // Get tenant ID from slug
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [context.tenantSlug]
    );
    const tenantId = tenant?.id || "default-tenant";

    // Validate
    if (!body.userName) {
      return errorResponse("Name is required", 400);
    }

    if (!body.items || body.items.length === 0) {
      return errorResponse("At least one item is required", 400);
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.productTypeId || !item.designId || !item.sizeId || !item.quantity || item.quantity < 1) {
        return errorResponse(
          "Each item must have a product type, design, size, and quantity >= 1",
          400
        );
      }
    }

    // Check for existing pending order
    const existing = await queryOne<{ id: string; order_number: string }>(
      `SELECT id, order_number FROM orders WHERE user_name = ? AND status = 'pending' AND tenant_id = ? LIMIT 1`,
      [body.userName, tenantId]
    );

    let orderId: string;
    let orderNumber: string;

    if (existing) {
      // Add items to existing order
      orderId = existing.id;
      orderNumber = existing.order_number;
      
      for (const item of body.items) {
        await execute(
          `INSERT INTO order_items (id, order_id, product_type_id, design_id, size_id, sleeve_length, fit, quantity, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            orderId,
            item.productTypeId,
            item.designId,
            item.sizeId,
            item.sleeveLength || null,
            item.fit || null,
            item.quantity,
          ]
        );
      }
    } else {
      // Create new order
      orderId = uuidv4();
      orderNumber = `thnk-${Date.now()}`;

      await withTransaction(async () => {
        await execute(
          `INSERT INTO orders (id, user_name, notes, order_number, status, tenant_id, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
          [orderId, body.userName, body.notes || null, orderNumber, tenantId]
        );

        for (const item of body.items) {
          await execute(
            `INSERT INTO order_items (id, order_id, product_type_id, design_id, size_id, sleeve_length, fit, quantity, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              uuidv4(),
              orderId,
              item.productTypeId,
              item.designId,
              item.sizeId,
              item.sleeveLength || null,
              item.fit || null,
              item.quantity,
            ]
          );
        }
      });
    }

    return successResponse(
      { orderId, orderNumber, message: "Order updated successfully" },
      201
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return errorResponse("Failed to create order", 500);
  }
}
