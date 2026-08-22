import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";

// GET all admin emails
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const db = getDb();
    const emails = db.prepare("SELECT id, email FROM admin_emails ORDER BY created_at ASC").all();
    return NextResponse.json({ emails });
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}

// POST new admin email
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare("INSERT INTO admin_emails (email) VALUES (?)").run(email);

    return NextResponse.json({
      id: result.lastInsertRowid,
      email,
      message: "Email added successfully",
    });
  } catch (error: any) {
    console.error("Error adding admin email:", error);
    
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "This email is already added" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to add email" }, { status: 500 });
  }
}
