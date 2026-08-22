import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPaymentNotification, PaymentNotificationData } from "@/lib/email";

export async function GET(request: NextRequest) {
  const db = getDb();
  const orderId = request.nextUrl.searchParams.get("orderId");
  const userName = request.nextUrl.searchParams.get("userName");

  let payments;
  if (orderId) {
    payments = db.prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC").all(orderId);
  } else if (userName) {
    payments = db.prepare("SELECT * FROM payments WHERE user_name = ? ORDER BY created_at DESC").all(userName);
  } else {
    // Admin: all payments with order info
    payments = db.prepare(`
      SELECT p.*, o.order_number
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC
    `).all();
  }

  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  const { orderId, userName, amountUsd, amountCrc, method, reference } = await request.json();

  if (!orderId || !userName || !method) {
    return NextResponse.json({ error: "orderId, userName, and method are required" }, { status: 400 });
  }

  const validMethods = ["zelle", "venmo", "paypal", "cash"];
  if (!validMethods.includes(method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO payments (order_id, user_name, amount_usd, amount_crc, method, reference, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(orderId, userName, amountUsd ?? null, amountCrc ?? null, method, reference ?? null);

  const paymentId = result.lastInsertRowid as number;

  // Fetch order details for email notification
  try {
    const order = db.prepare(`
      SELECT o.id, o.order_number, o.user_name
      FROM orders o
      WHERE o.id = ?
    `).get(orderId) as { id: string; order_number: string; user_name: string } | undefined;

    if (order) {
      const items = db.prepare(`
        SELECT 
          pt.name as product_name,
          d.name as design_name,
          s.name as size_name,
          COALESCE(oi.fit, '') as fit,
          oi.quantity
        FROM order_items oi
        JOIN product_types pt ON oi.product_type_id = pt.id
        JOIN designs d ON oi.design_id = d.id
        JOIN sizes s ON oi.size_id = s.id
        WHERE oi.order_id = ?
      `).all(orderId) as { product_name: string; design_name: string; size_name: string; fit: string; quantity: number }[];

      const notificationData: PaymentNotificationData = {
        userName: order.user_name,
        orderNumber: order.order_number || order.id.slice(0, 8),
        orderId,
        orderItems: items,
        paymentMethod: method,
        amountUsd,
        amountCrc,
        reference,
        paymentId,
      };

      // Send notification (non-blocking)
      sendPaymentNotification(notificationData).catch(err => {
        console.error("Error sending payment notification:", err);
      });
    }
  } catch (error) {
    console.error("Error preparing payment notification:", error);
    // Don't fail the payment submission if email fails
  }

  return NextResponse.json({ id: paymentId, message: "Payment submitted" }, { status: 201 });
}
