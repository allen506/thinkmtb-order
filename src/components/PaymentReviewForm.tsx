"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_usd: number;
  price_crc: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_usd: number;
  total_crc: number;
  team_name: string;
  notes: string;
  created_at: string;
}

interface Payment {
  id: string;
  status: string;
  amount_usd: number;
  bac_payment_link: string;
}

interface PaymentReviewFormProps {
  orderId: string;
  teamName: string;
}

export default function PaymentReviewForm({
  orderId,
  teamName,
}: PaymentReviewFormProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [depositUsd, setDepositUsd] = useState(0);
  const [depositCrc, setDepositCrc] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(
          `/api/orders/${orderId}/payment`,
          {
            headers: {
              "x-tenant-slug": teamName.toLowerCase(),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load order");
        }

        const data = await response.json();
        setOrder(data.order);
        setItems(data.items || []);
        setPayment(data.payment || null);
        setDepositUsd(data.depositUsd || 0);
        setDepositCrc(data.depositCrc || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, teamName]);

  const handleRequestPayment = async () => {
    if (!window.confirm("Request payment link from admin?")) return;

    setIsRequesting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders/${orderId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": teamName.toLowerCase(),
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to request payment");
      }

      const data = await response.json();
      setSuccess(
        "Payment request created! Admin will send you a payment link within 24 hours."
      );
      setPayment({
        id: data.paymentId,
        status: "requested",
        amount_usd: data.amount.usd,
        bac_payment_link: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error requesting payment");
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error || "Order not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="text-lg font-bold text-gray-900">{order.order_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Team
            </p>
            <p className="text-lg font-bold text-gray-900">{order.team_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Status
            </p>
            <p className="text-lg font-bold text-blue-600">
              {order.status.replace(/_/g, " ").toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Created
            </p>
            <p className="text-lg font-bold text-gray-900">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="p-4 bg-blue-50 rounded-lg mb-6 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-1">Notes:</p>
            <p className="text-blue-800">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${item.price_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${(item.price_usd * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-right">
            <p className="text-gray-600 mb-2">
              Subtotal: <span className="font-semibold">${order.total_usd.toFixed(2)}</span>
            </p>
            <p className="text-xs text-gray-500">
              ₡{order.total_crc.toLocaleString()} CRC
            </p>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-1">50% Deposit Due</p>
            <p className="text-2xl font-bold text-blue-600">
              ${depositUsd.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ₡{depositCrc.toLocaleString()} CRC
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Final Payment (Later)</p>
            <p className="text-2xl font-bold text-gray-900">
              ${depositUsd.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Due after items ship
            </p>
          </div>
        </div>

        {!payment ? (
          <>
            <p className="text-sm text-gray-700 mb-4">
              Ready to proceed? Click below to request a payment link from our admin team.
              We'll send you a secure BAC (payment) link within 24 hours.
            </p>
            <button
              onClick={handleRequestPayment}
              disabled={isRequesting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {isRequesting ? "Requesting..." : "Request Payment Link"}
            </button>
          </>
        ) : (
          <>
            <div className="p-4 bg-white rounded-lg border-2 border-green-200 mb-4">
              <p className="text-sm text-green-700 font-semibold mb-2">
                ✓ Payment Requested
              </p>
              <p className="text-gray-700">
                Payment status: <span className="font-semibold capitalize">{payment.status}</span>
              </p>
              {payment.bac_payment_link && (
                <div className="mt-3 p-3 bg-green-50 rounded">
                  <p className="text-sm text-green-900 mb-2">Payment Link:</p>
                  <a
                    href={payment.bac_payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-900 font-mono text-sm break-all"
                  >
                    {payment.bac_payment_link}
                  </a>
                </div>
              )}
              {!payment.bac_payment_link && payment.status === "requested" && (
                <p className="text-sm text-gray-600 mt-3">
                  Admin is processing your request. Check your email for the payment link or check back here.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Next Steps */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Next Steps</h4>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">1.</span>
            <div>
              <p className="font-semibold text-gray-900">Request Payment</p>
              <p className="text-sm text-gray-600">
                {payment ? "✓ Completed" : "Click button above"}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-gray-400">2.</span>
            <div>
              <p className="font-semibold text-gray-900">Receive Payment Link</p>
              <p className="text-sm text-gray-600">Via email from admin (within 24 hours)</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-gray-400">3.</span>
            <div>
              <p className="font-semibold text-gray-900">Send Payment</p>
              <p className="text-sm text-gray-600">50% deposit via provided link</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-gray-400">4.</span>
            <div>
              <p className="font-semibold text-gray-900">Order Processing</p>
              <p className="text-sm text-gray-600">Your items are created and shipped</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-gray-400">5.</span>
            <div>
              <p className="font-semibold text-gray-900">Final Payment</p>
              <p className="text-sm text-gray-600">50% remaining + shipping costs</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
