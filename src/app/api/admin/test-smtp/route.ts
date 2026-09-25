import { NextRequest } from "next/server";
import {
  queryOne,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import nodemailer from "nodemailer";

interface SMTPSettings {
  host: string;
  port: number;
  secure: number;
  username: string;
  password: string;
  from_email: string;
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const settings = await queryOne<SMTPSettings>(
      "SELECT * FROM smtp_settings WHERE id = 1"
    );

    if (!settings) {
      return errorResponse("SMTP settings not configured", 400);
    }

    // Get the test email address from the request
    const { testEmail } = await request.json();
    if (!testEmail) {
      return errorResponse("Test email address required", 400);
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure === 1,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
    });

    // Send test email
    await transporter.sendMail({
      from: settings.from_email,
      to: testEmail,
      subject: "ThinkMTB - SMTP Configuration Test",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; margin-bottom: 16px;">✓ SMTP Configuration Test Successful</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
            Your SMTP configuration is working correctly! This is a test email from ThinkMTB's admin system.
          </p>
          <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #374151; margin: 0; font-size: 14px;">
              <strong>Configuration Details:</strong><br/>
              Host: ${settings.host}<br/>
              Port: ${settings.port}<br/>
              Security: ${settings.secure === 1 ? "SSL (465)" : "TLS (587)"}<br/>
              From: ${settings.from_email}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            You can now configure admin emails to receive payment notifications.
          </p>
        </div>
      `,
    });

    return successResponse({ success: true, message: "Test email sent successfully!" });
  } catch (error: any) {
    console.error("SMTP test error:", error);
    return errorResponse(
      error.message || "Failed to send test email",
      500
    );
  }
}
