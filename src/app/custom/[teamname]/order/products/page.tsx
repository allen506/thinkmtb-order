import { redirect } from "next/navigation";
import ProductSelectionForm from "@/components/ProductSelectionForm";
import { getDb } from "@/lib/db";

export default async function ProductSelectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamname: string }>;
  searchParams: Promise<{ designRequestId?: string }>;
}) {
  const { teamname } = await params;
  const { designRequestId } = await searchParams;

  // Verify team exists
  const db = getDb();
  const team = db
    .prepare("SELECT id, name FROM teams WHERE slug = ?")
    .get(teamname.toLowerCase()) as { id: string; name: string } | undefined;

  if (!team) {
    redirect("/custom");
  }

  // If designRequestId provided, verify it's approved
  if (designRequestId) {
    const designRequest = db
      .prepare("SELECT status FROM design_requests WHERE id = ?")
      .get(designRequestId) as { status: string } | undefined;

    if (!designRequest || designRequest.status !== "approved") {
      redirect(`/custom/${teamname}/order/design-requests`);
    }
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
          <span className="text-gray-900 font-semibold">Products & Pricing</span>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Step 2: Select Products & Pricing
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
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
                  2
                </div>
                <span className="ml-3 text-gray-900 font-semibold">
                  Products & Pricing
                </span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-bold">
                  3
                </div>
                <span className="ml-3 text-gray-600">Payment & Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <ProductSelectionForm teamName={teamname} designRequestId={designRequestId} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                How Pricing Works
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Prices adjust based on quantity</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Larger orders get better rates</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Special pricing may apply to your team</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Displayed in USD and CRC</span>
                </li>
              </ul>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Payment Process
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <div>
                    <p className="font-semibold">50% Deposit</p>
                    <p className="text-gray-500">Due upfront</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <div>
                    <p className="font-semibold">Order Processing</p>
                    <p className="text-gray-500">Your items are created</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <div>
                    <p className="font-semibold">Final Payment + Shipping</p>
                    <p className="text-gray-500">Pay remaining balance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-bold text-amber-900 mb-3">💡 Pro Tips</h4>
              <ul className="text-xs text-amber-800 space-y-2">
                <li>• Order in bulk to save per-unit cost</li>
                <li>• Ask admin about volume discounts</li>
                <li>• Multiple products can be ordered together</li>
                <li>• Exchange rate is updated daily</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
