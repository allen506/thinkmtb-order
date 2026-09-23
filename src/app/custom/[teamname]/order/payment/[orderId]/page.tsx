import { redirect } from "next/navigation";
import PaymentReviewForm from "@/components/PaymentReviewForm";
import { getDb } from "@/lib/db";

export default async function PaymentReviewPage({
  params,
}: {
  params: Promise<{ teamname: string; orderId: string }>;
}) {
  const { teamname, orderId } = await params;

  // Verify team exists
  const db = getDb();
  const team = db
    .prepare("SELECT id, name FROM teams WHERE slug = ?")
    .get(teamname.toLowerCase()) as { id: string; name: string } | undefined;

  if (!team) {
    redirect("/custom");
  }

  // Verify order exists
  const order = db
    .prepare("SELECT id FROM orders WHERE id = ? AND team_id = ?")
    .get(orderId, team.id) as { id: string } | undefined;

  if (!order) {
    redirect(`/custom/${teamname}/order`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-gray-600">
          <a href={`/custom/${teamname}`} className="hover:text-gray-900">
            {team.name}
          </a>
          {" / "}
          <a href={`/custom/${teamname}/order`} className="hover:text-gray-900">
            Order
          </a>
          {" / "}
          <span className="text-gray-900 font-semibold">Payment & Review</span>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Step 3: Payment & Review
          </h1>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center flex-1">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold">
                  ✓
                </div>
                <span className="ml-3 text-gray-600">Design Request</span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold">
                  ✓
                </div>
                <span className="ml-3 text-gray-600">Products & Pricing</span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
                  3
                </div>
                <span className="ml-3 text-gray-900 font-semibold">
                  Payment & Review
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <PaymentReviewForm orderId={orderId} teamName={teamname} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Payment Timeline
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="text-green-600 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-gray-900">Design Approved</p>
                    <p className="text-gray-600 text-xs">Completed</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-gray-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-green-600 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-gray-900">Products Selected</p>
                    <p className="text-gray-600 text-xs">Completed</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-blue-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-blue-600 font-bold">→</div>
                  <div>
                    <p className="font-semibold text-gray-900">Request Payment Link</p>
                    <p className="text-gray-600 text-xs">In progress</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-gray-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-gray-400 font-bold">4.</div>
                  <div>
                    <p className="font-semibold text-gray-900">Send Payment</p>
                    <p className="text-gray-600 text-xs">Pending</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">FAQ</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    Why 50% now?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    This secures your order and covers design and production costs.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    How long for items?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Typically 2-3 weeks from payment received.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    Can I change my order?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Contact admin before payment is received.
                  </p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-bold text-amber-900 mb-3">📞 Need Help?</h4>
              <p className="text-sm text-amber-800 mb-3">
                Contact our admin team if you have any questions about your order or payment.
              </p>
              <a
                href={`/custom/${teamname}`}
                className="inline-block text-amber-700 hover:text-amber-900 font-semibold text-sm"
              >
                View Team Contact Info →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
