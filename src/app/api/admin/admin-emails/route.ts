import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

// GET all admin emails
export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const emails = await query<any>(
      "SELECT id, email, created_at FROM admin_emails ORDER BY created_at ASC"
    );
    return successResponse({ emails });
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return errorResponse("Failed to fetch emails", 500);
  }
}

// POST new admin email
export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return errorResponse("Invalid email address", 400);
    }

    // Check if email already exists
    const existing = await queryOne(
      "SELECT id FROM admin_emails WHERE email = ?",
      [email]
    );

    if (existing) {
      return errorResponse("This email is already added", 409);
    }

    const id = uuidv4();
    await execute(
      `INSERT INTO admin_emails (id, email, created_at) VALUES (?, ?, NOW())`,
      [id, email]
    );

    return successResponse(
      { id, email, message: "Email added successfully" },
      201
    );
  } catch (error: any) {
    console.error("Error adding admin email:", error);
    return errorResponse("Failed to add email", 500);
  }
}
