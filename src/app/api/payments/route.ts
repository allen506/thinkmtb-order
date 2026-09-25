import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";
import { sendPaymentNotification, PaymentNotificationData } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    const userName = request.nextUrl.searchParams.get("userName");

    let payments;
    if (orderId) {
      payments = await query<any>(
        "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC",
        [orderId]
      );
    } else if (userName) {
      payments = await query<any>(
        "SELECT * FROM payments WHERE user_name = ? ORDER BY created_at DESC",
        [userName]
      );
    } else {
      // Admin: all payments with order info
      payments = await query<any>(
        `SELECT p.*, o.order_number
         FROM payments p
         LEFT JOIN orders o ON p.order_id = o.id
         ORDER BY p.created_at DESC`,
        []
      );
    }

    return successResponse({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return errorResponse("Failed to fetch payments", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, userName, amountUsd, amountCrc, method, reference } =
      await request.json();

    if (!orderId || !userName || !method) {
      return errorResponse(
        "orderId, userName, and method are required",
        400
      );
    }

    const validMethods = ["zelle", "venmo", "paypal", "cash"];
    if (!validMethods.includes(method)) {
      return errorResponse("Invalid payment method", 400);
    }

    const paymentId = uuidv4();
    await execute(
      `INSERT INTO payments (id, order_id, user_name, amount_usd, amount_crc, method, reference, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [paymentId, orderId, userName, amountUsd ?? null, amountCrc ?? null, method, reference ?? null]
    );

    // Fetch order details for email notification
    try {
      const order = await queryOne<{
        id: string;
        order_number: string;
        user_name: string;
      }>(
        `SELECT o.id, o.order_number, o.user_name FROM orders o WHERE o.id = ?`,
        [orderId]
      );

      if (order) {
        const items = await query<{
          product_name: string;
          design_name: string;
          size_name: string;
          fit: string;
          quantity: number;
        }>(
          `SELECT pt.name as product_name, d.name as design_name,
            s.name as size_name, COALESCE(oi.fit, '') as fit, oi.quantity
           FROM order_items oi
           JOIN product_types pt ON oi.product_type_id = pt.id
           JOIN designs d ON oi.design_id = d.id
           JOIN sizes s ON oi.size_id = s.id
           WHERE oi.order_id = ?`,
          [orderId]
        );

        const notificationData: PaymentNotificationData = {
          userName: order.user_name,
          orderNumber: order.order_number || order.id.slice(0, 8),
          orderId,
          orderItems: items,
          paymentMethod: method,
          amountUsd,
          amountCrc,
          reference,
          paymentId: paymentId as any,
        };

        // Send notification (non-blocking)
        sendPaymentNotification(notificationData).catch((err) => {
          console.error("Error sending payment notification:", err);
        });
      }
    } catch (error) {
      console.error("Error preparing payment notification:", error);
      // Don't fail the payment submission if email fails
    }

    return successResponse({ id: paymentId, message: "Payment submitted" }, 201);
  } catch (error) {
    console.error("Error creating payment:", error);
    return errorResponse("Failed to create payment", 500);
  }
}
