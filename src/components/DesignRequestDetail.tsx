"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface File {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface Submission {
  id: string;
  designer_email: string;
  submission_number: number;
  status: string;
  created_at: string;
  files: File[];
}

interface Comment {
  id: string;
  comment: string;
  user_email: string;
  created_at: string;
}

interface DesignRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  requester_email: string;
  created_at: string;
}

interface DesignRequestDetailProps {
  requestId: string;
  teamName: string;
}

export default function DesignRequestDetail({
  requestId,
  teamName,
}: DesignRequestDetailProps) {
  const [request, setRequest] = useState<DesignRequest | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/designs/requests/${requestId}`, {
          headers: {
            "x-tenant-slug": teamName.toLowerCase(),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load design request");
        }

        const data = await response.json();
        setRequest(data.request);
        setSubmissions(data.submissions || []);
        setComments(data.comments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [requestId, teamName]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(
        `/api/designs/requests/${requestId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": teamName.toLowerCase(),
          },
          body: JSON.stringify({ comment: newComment }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      setNewComment("");

      // Refresh comments
      const commentsResponse = await fetch(
        `/api/designs/requests/${requestId}/comments`,
        {
          headers: {
            "x-tenant-slug": teamName.toLowerCase(),
          },
        }
      );
      const commentsData = await commentsResponse.json();
      setComments(commentsData.comments || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleApproveSubmission = async (submissionId: string) => {
    if (!window.confirm("Approve this design?")) return;

    try {
      const response = await fetch(
        `/api/designs/requests/${requestId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": teamName.toLowerCase(),
          },
          body: JSON.stringify({ status: "approved" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve design");
      }

      // Refresh data
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error approving design");
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    if (!window.confirm("Reject this design?")) return;

    try {
      const response = await fetch(
        `/api/designs/requests/${requestId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": teamName.toLowerCase(),
          },
          body: JSON.stringify({ status: "rejected" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject design");
      }

      // Refresh data
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error rejecting design");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading design request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error || "Design request not found"}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_design":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {request.title}
            </h1>
            <p className="text-gray-600">{request.description}</p>
          </div>
          <span
            className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(
              request.status
            )}`}
          >
            {request.status.toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Created: {formatDate(request.created_at)}
        </div>
      </div>

      {/* Submissions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Designer Submissions ({submissions.length})
        </h2>

        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Designers are working on your design request
            </p>
            <p className="text-sm text-gray-500">
              Check back soon for their submissions
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Submission #{submission.submission_number}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      by {submission.designer_email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(submission.created_at)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      submission.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : submission.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {submission.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                {submission.files.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Design Files
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {submission.files.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-2xl mb-2">📄</div>
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.file_type}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {submission.status === "pending_review" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveSubmission(submission.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      ✓ Approve Design
                    </button>
                    <button
                      onClick={() => handleRejectSubmission(submission.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      ✕ Request Changes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Comments & Feedback
        </h2>

        {/* Add Comment */}
        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or request changes from the designer..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmittingComment}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingComment || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {isSubmittingComment ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-900">
                    {comment.user_email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(comment.created_at)}
                  </p>
                </div>
                <p className="text-gray-700">{comment.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Back Link */}
      <div>
        <Link
          href={`/custom/${teamName}/order/design-requests`}
          className="text-blue-600 hover:text-blue-900 font-semibold"
        >
          ← Back to Design Requests
        </Link>
      </div>
    </div>
  );
}
