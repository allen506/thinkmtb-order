import { redirect } from "next/navigation";
import DesignRequestsList from "@/components/DesignRequestsList";
import Link from "next/link";
import { getDb } from "@/lib/db";

export default async function DesignRequestsPage({
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
          <span className="text-gray-900 font-semibold">Design Requests</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Design Requests
            </h1>
            <p className="text-gray-600">
              View and manage all your custom design requests
            </p>
          </div>
          <Link
            href={`/custom/${teamname}/order/design`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            + New Request
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <DesignRequestsList teamName={teamname} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                How It Works
              </h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Submit your design requirements</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Our designers create proposals</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Review and provide feedback</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Approve your favorite design</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Select products and order</span>
                </li>
              </ol>
            </div>

            {/* Status Guide */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Request Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Pending</span> - Awaiting
                    designer review
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">In Design</span> - Designers
                    working
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Approved</span> - Ready to
                    order
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Rejected</span> - Requesting
                    changes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
