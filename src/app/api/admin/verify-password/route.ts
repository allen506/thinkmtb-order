import { NextRequest, NextResponse } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  verifyPassword,
  createSessionToken,
  hashPassword,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return errorResponse("Password is required", 400);
    }

    console.log("Received password verification request");

    // For now, check against hardcoded env var (TODO: use tenant_admins table)
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedAdminPassword = hashPassword(adminPassword);
    
    if (!verifyPassword(password, hashedAdminPassword)) {
      console.warn("Password mismatch - invalid password");
      return errorResponse("Invalid password", 401);
    }

    console.log("Password verified, creating session token");

    // Create admin session token
    const sessionId = uuidv4();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    console.log("Inserting session into database", { sessionId, token, expiresAt });

    await execute(
      `INSERT INTO admin_sessions (id, token, expires_at) VALUES ($1, $2, $3)`,
      [sessionId, token, expiresAt.toISOString()]
    );

    console.log("Session created successfully");

    // Set secure httpOnly cookie for the session
    const response = NextResponse.json({ valid: true });
    response.cookies.set({
      name: "admin-session",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/"
    });
    return response;
  } catch (error) {
    console.error("Error verifying admin password:", error);
    return errorResponse("Verification failed", 500);
  }
}
