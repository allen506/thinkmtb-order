import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  extractContext,
  requireAuth,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

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

    // Get submissions with their files
    const submissions = await query<any>(
      `SELECT ds.id, ds.request_id, ds.designer_id, ds.submission_number,
        ds.status, ds.notes, ds.created_at, ds.updated_at,
        ua.email as designer_email
       FROM design_submissions ds
       LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
       WHERE ds.request_id = ?
       ORDER BY ds.submission_number DESC`,
      [id]
    );

    // Get files for each submission
    const submissionsWithFiles = await Promise.all(
      submissions.map(async (submission) => ({
        ...submission,
        files: await query<any>(
          `SELECT id, file_url, file_name, file_type, created_at
           FROM design_submission_files
           WHERE submission_id = ?
           ORDER BY created_at DESC`,
          [submission.id]
        ),
      }))
    );

    return successResponse({
      success: true,
      submissions: submissionsWithFiles,
      count: submissionsWithFiles.length,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return errorResponse("Failed to fetch submissions", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

    // Require auth and check if designer
    const authError = requireAuth(ctx);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    if (ctx.userRole !== "designer") {
      return errorResponse("Only designers can submit designs", 403);
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Verify request exists
    const designRequest = await queryOne<any>(
      "SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );

    if (!designRequest) {
      return errorResponse("Design request not found", 404);
    }

    // Get next submission number
    const lastSubmission = await queryOne<{ submission_number: number }>(
      `SELECT submission_number FROM design_submissions WHERE request_id = ?
       ORDER BY submission_number DESC LIMIT 1`,
      [id]
    );

    const submissionNumber = (lastSubmission?.submission_number || 0) + 1;
    const submissionId = uuidv4();

    const { notes } = await request.json();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    // Create submission record
    await execute(
      `INSERT INTO design_submissions
        (id, request_id, designer_id, submission_number, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending_review', ?, NOW(), NOW())`,
      [submissionId, id, ctx.userId, submissionNumber, notes || ""]
    );

    // Upload submission files
    const uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileId = uuidv4();
        const fileName = file.name;
        const fileType = file.type;
        const fileUrl = `/uploads/design-submissions/${submissionId}/${fileName}`;

        await execute(
          `INSERT INTO design_submission_files
            (id, submission_id, file_url, file_name, file_type, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [fileId, submissionId, fileUrl, fileName, fileType]
        );

        uploadedFiles.push({
          fileId,
          fileName,
          fileType,
          fileUrl,
        });
      }
    }

    // Update request status to 'in_design' if it's still pending
    if (designRequest.status === "pending") {
      await execute(
        "UPDATE design_requests SET status = ?, updated_at = NOW() WHERE id = ?",
        ["in_design", id]
      );
    }

    return successResponse(
      {
        success: true,
        submissionId,
        submissionNumber,
        uploadedFiles,
        message: "Design submission created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return errorResponse("Failed to create submission", 500);
  }
}
