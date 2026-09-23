import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface OrderItem {
  productId: string;
  quantity: number;
  priceCrc: number;
  priceUsd: number;
  designApprovedId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");
    const teamId = request.headers.get("x-team-id");

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: "User ID and Team ID required in headers" },
        { status: 400 }
      );
    }

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { items, designRequestId, notes } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one product item is required" },
        { status: 400 }
      );
    }

    // Verify design request exists and is approved
    if (designRequestId) {
      const designRequest = db
        .prepare(
          "SELECT status FROM design_requests WHERE id = ? AND tenant_id = ?"
        )
        .get(designRequestId, tenant.id) as any;

      if (!designRequest) {
        return NextResponse.json(
          { error: "Design request not found" },
          { status: 404 }
        );
      }

      if (designRequest.status !== "approved") {
        return NextResponse.json(
          { error: "Design must be approved before placing order" },
          { status: 400 }
        );
      }
    }

    // Create order
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let totalCrc = 0;
    let totalUsd = 0;

    // Calculate totals from items
    for (const item of items) {
      totalCrc += item.priceCrc * item.quantity;
      totalUsd += item.priceUsd * item.quantity;
    }

    // Create order record
    const orderResult = db
      .prepare(
        `
      INSERT INTO orders 
        (id, tenant_id, team_id, user_id, status, total_crc, total_usd, order_number, design_request_id, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
      )
      .run(
        orderId,
        tenant.id,
        teamId,
        userId,
        "draft_products_selected",
        totalCrc,
        totalUsd,
        `thnk-${Date.now()}`,
        designRequestId || null,
        notes || ""
      );

    if (orderResult.changes === 0) {
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Add order items
    const insertItem = db.prepare(
      `
      INSERT INTO order_items 
        (id, order_id, product_type_id, tenant_id, quantity, price_crc, price_usd, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
    );

    for (const item of items) {
      const itemId = `oit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertItem.run(
        itemId,
        orderId,
        item.productId,
        tenant.id,
        item.quantity,
        item.priceCrc,
        item.priceUsd
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        totalCrc,
        totalUsd,
        itemCount: items.length,
        message: "Order created. Proceed to payment.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    // Get tenant ID
    const tenant = db
      .prepare("SELECT id FROM tenants WHERE slug = ?")
      .get(tenantSlug) as { id: string } | undefined;

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get user's draft orders
    const orders = db
      .prepare(
        `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_crc,
        o.total_usd,
        o.design_request_id,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ? AND o.tenant_id = ? AND o.status LIKE 'draft%'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `
      )
      .all(userId, tenant.id);

    return NextResponse.json({
      success: true,
      orders,
      count: (orders as any[]).length,
    });
  } catch (error) {
    console.error("Error fetching draft orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
