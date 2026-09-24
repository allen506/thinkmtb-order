import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, errorResponse, successResponse, extractContext, requireAuth } from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id: orderId } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Get order with all details
    const order = await queryOne<any>(
      `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_crc,
        o.total_usd,
        o.user_id,
        o.notes,
        o.created_at,
        o.design_request_id,
        t.name as team_name
      FROM orders o
      LEFT JOIN teams t ON t.id = o.team_id
      WHERE o.id = ? AND o.tenant_id = ?
    `,
      [orderId, tenant.id]
    );

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // Access control: only user who created order or admin
    if (order.user_id !== ctx.userId && ctx.userRole !== "admin") {
      return errorResponse("Access denied", 403);
    }

    // Get order items
    const items = await query<any>(
      `
      SELECT 
        oi.id,
        oi.product_type_id,
        oi.quantity,
        oi.price_usd,
        oi.price_crc,
        pt.name as product_name
      FROM order_items oi
      LEFT JOIN product_types pt ON pt.id = oi.product_type_id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at ASC
    `,
      [orderId]
    );

    // Get payment info
    const payment = await queryOne<any>(
      `
      SELECT 
        id,
        payment_stage,
        amount_usd,
        amount_crc,
        status,
        bac_payment_link,
        payment_reference,
        created_at,
        updated_at
      FROM order_payments
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [orderId]
    );

    // Calculate deposit (50% of total)
    const depositUsd = order.total_usd / 2;
    const depositCrc = order.total_crc / 2;

    return successResponse({
      success: true,
      order,
      items,
      payment,
      depositUsd,
      depositCrc,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id: orderId } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Get order
    const order = await queryOne<any>(
      "SELECT id, total_usd, total_crc, user_id FROM orders WHERE id = ? AND tenant_id = ?",
      [orderId, tenant.id]
    );

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // Access control
    if (order.user_id !== ctx.userId) {
      return errorResponse("Only order creator can request payment", 403);
    }

    // Check if payment request already exists
    const existing = await queryOne<any>(
      `
      SELECT id FROM order_payments
      WHERE order_id = ? AND status IN ('requested', 'paid', 'confirmed')
    `,
      [orderId]
    );

    if (existing) {
      return errorResponse("Payment already requested or in progress", 400);
    }

    // Create payment record for 50% deposit
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const depositUsd = order.total_usd / 2;
    const depositCrc = order.total_crc / 2;

    const result = await execute(
      `
      INSERT INTO order_payments 
        (id, order_id, payment_stage, amount_usd, amount_crc, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [paymentId, orderId, "deposit_50", depositUsd, depositCrc, "requested"]
    );

    if (result.changes === 0) {
      return errorResponse("Failed to create payment request", 500);
    }

    // Update order status
    await execute("UPDATE orders SET status = ? WHERE id = ?", [
      "payment_requested",
      orderId,
    ]);

    return successResponse(
      {
        success: true,
        paymentId,
        message: "Payment request created. Admin will send you a payment link shortly.",
        amount: {
          usd: depositUsd,
          crc: depositCrc,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error creating payment request:", error);
    return errorResponse("Failed to create payment request", 500);
  }
}
