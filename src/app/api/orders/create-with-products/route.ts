import { NextRequest, NextResponse } from "next/server";
import {
  query,
  queryOne,
  execute,
  withTransaction,
  extractContext,
  requireAuth,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";

interface OrderItem {
  productId: string;
  quantity: number;
  priceCrc: number;
  priceUsd: number;
  designApprovedId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extractContext(request);
    const teamId = request.headers.get("x-team-id");

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 400);
    }

    if (!teamId) {
      return errorResponse("Team ID required in headers", 400);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    const { items, designRequestId, notes } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("At least one product item is required", 400);
    }

    // Verify design request exists and is approved
    if (designRequestId) {
      const designRequest = await queryOne<any>(
        "SELECT status FROM design_requests WHERE id = ? AND tenant_id = ?",
        [designRequestId, tenant.id]
      );

      if (!designRequest) {
        return errorResponse("Design request not found", 404);
      }

      if (designRequest.status !== "approved") {
        return errorResponse(
          "Design must be approved before placing order",
          400
        );
      }
    }

    // Create order with items in transaction
    return await withTransaction(async (tx) => {
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let totalCrc = 0;
      let totalUsd = 0;

      // Calculate totals from items
      for (const item of items) {
        totalCrc += item.priceCrc * item.quantity;
        totalUsd += item.priceUsd * item.quantity;
      }

      // Create order record
      const orderResult = await tx.execute(
        `
        INSERT INTO orders 
          (id, tenant_id, team_id, user_id, status, total_crc, total_usd, order_number, design_request_id, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
        [
          orderId,
          tenant.id,
          teamId,
          ctx.userId,
          "draft_products_selected",
          totalCrc,
          totalUsd,
          `thnk-${Date.now()}`,
          designRequestId || null,
          notes || "",
        ]
      );

      if (orderResult.changes === 0) {
        throw new Error("Failed to create order");
      }

      // Add order items
      for (const item of items) {
        const itemId = `oit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await tx.execute(
          `
          INSERT INTO order_items 
            (id, order_id, product_type_id, tenant_id, quantity, price_crc, price_usd, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `,
          [
            itemId,
            orderId,
            item.productId,
            tenant.id,
            item.quantity,
            item.priceCrc,
            item.priceUsd,
          ]
        );
      }

      return successResponse(
        {
          success: true,
          orderId,
          orderNumber: `thnk-${Date.now()}`,
          message: "Order created successfully",
          items: items.length,
          totals: {
            usd: totalUsd,
            crc: totalCrc,
          },
        },
        201
      );
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return errorResponse("Failed to create order", 500);
  }
}

