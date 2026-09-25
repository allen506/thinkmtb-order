import { NextRequest } from "next/server";
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

// GET /api/user/profile?pin=1234
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin");
  if (!pin || !/^\d{4}$/.test(pin)) {
    return errorResponse("Invalid PIN", 400);
  }

  try {
    const profile = await queryOne<{ pin: string; full_name: string }>(
      "SELECT pin, full_name FROM user_profiles WHERE pin = ?",
      [pin]
    );

    if (!profile) {
      return errorResponse("PIN not found", 404);
    }

    return successResponse({ pin: profile.pin, fullName: profile.full_name });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return errorResponse("Failed to fetch profile", 500);
  }
}

// POST /api/user/profile — create a new profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, fullName } = body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return errorResponse("PIN must be exactly 4 digits", 400);
    }
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return errorResponse("Full name is required", 400);
    }

    const existing = await queryOne<{ pin: string }>(
      "SELECT pin FROM user_profiles WHERE pin = ?",
      [pin]
    );
    if (existing) {
      return errorResponse("PIN already taken — choose a different one", 409);
    }

    await execute(
      "INSERT INTO user_profiles (id, pin, full_name, created_at) VALUES (?, ?, ?, NOW())",
      [uuidv4(), pin, fullName.trim()]
    );

    return successResponse(
      { pin, fullName: fullName.trim() },
      201
    );
  } catch (error) {
    console.error("Error creating profile:", error);
    return errorResponse("Failed to create profile", 500);
  }
}
