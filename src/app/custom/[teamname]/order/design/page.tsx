import { redirect } from "next/navigation";
import DesignRequestForm from "@/components/DesignRequestForm";
import { getDb } from "@/lib/db";

export default async function DesignRequestPage({
  params,
}: {
  params: Promise<{ teamname: string }>;
}) {
  const { teamname } = await params;

  // Verify team exists
  const db = getDb();
  const team = db
    .prepare("SELECT id, name FROM teams WHERE slug = ?")
    .get(teamname.toLowerCase()) as { id: string; name: string } | undefined;

  if (!team) {
    redirect("/custom");
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
          <span className="text-gray-900 font-semibold">Design Request</span>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Step 1: Design Request
          </h1>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center flex-1">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
                  1
                </div>
                <span className="ml-3 text-gray-900 font-semibold">
                  Design Request
                </span>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-4" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 rounded-full font-bold">
                  2
                </div>
                <span className="ml-3 text-gray-600">Products & Pricing</span>
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
            <DesignRequestForm teamName={teamname} />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Current Step */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                This Step
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Submit your design requirements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Upload reference images or logos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">•</span>
                  <span>Our designers will create proposals</span>
                </li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Order Timeline
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="text-blue-600 font-bold">1.</div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Submit Design
                    </p>
                    <p className="text-gray-600">You are here</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-gray-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-gray-400 font-bold">2.</div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Designer Review
                    </p>
                    <p className="text-gray-600">2-3 business days</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-gray-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-gray-400 font-bold">3.</div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Select Products
                    </p>
                    <p className="text-gray-600">After approval</p>
                  </div>
                </div>
                <div className="h-4 border-l-2 border-gray-300 ml-2" />
                <div className="flex gap-3">
                  <div className="text-gray-400 font-bold">4.</div>
                  <div>
                    <p className="font-semibold text-gray-900">Complete Order</p>
                    <p className="text-gray-600">Pay and ship</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-bold text-amber-900 mb-3">💡 Pro Tips</h4>
              <ul className="text-xs text-amber-800 space-y-2">
                <li>Be specific about colors and style</li>
                <li>Include your team name and logo</li>
                <li>Mention any design inspiration</li>
                <li>Upload multiple reference images</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
