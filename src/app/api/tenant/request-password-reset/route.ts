import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

/**
 * Request password reset
 * POST /api/tenant/request-password-reset
 * Body: { teamSlug, email }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, email } = await request.json();

    if (!teamSlug || !email) {
      return NextResponse.json(
        { error: 'Team slug and email are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify team exists
    const redirect = db
      .prepare('SELECT * FROM subdomain_redirects WHERE subdomain = ?')
      .get(teamSlug) as any;

    if (!redirect) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = db
      .prepare('SELECT * FROM users WHERE email = ? AND tenant_id = ?')
      .get(email, redirect.tenant_id) as any;

    if (!user) {
      // For security, still return success (don't reveal if email exists)
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token in database
    try {
      db.prepare(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?'
      ).run(resetTokenHash, resetTokenExpiry.toISOString(), user.id);
    } catch (error) {
      // Table might not have these columns - create them if needed
      console.error('Error storing reset token:', error);
    }

    // TODO: Send email with reset link
    // This is where you'd call your SMTP service
    // Email content:
    /*
      Subject: Password Reset Request
      Body:
      Click this link to reset your password:
      https://custom.cmssportswear.us/custom/{teamSlug}/reset-password?token={resetToken}
      
      This link expires in 24 hours.
    */

    // For now, log the token (in production, send via SMTP)
    console.log(
      `[DEV] Password reset link for ${email}: /custom/${teamSlug}/reset-password?token=${resetToken}`
    );

    return NextResponse.json({
      success: true,
      message:
        'If an account with this email exists, a reset link has been sent to your email',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
