import { NextRequest } from 'next/server';
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  hashPassword,
} from '@/lib/route-helpers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request password reset
 * POST /api/tenant/request-password-reset
 * Body: { teamSlug, email }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, email } = await request.json();

    if (!teamSlug || !email) {
      return errorResponse('Team slug and email are required', 400);
    }

    // Verify team exists
    const redirect = await queryOne<any>(
      'SELECT tenant_id FROM subdomain_redirects WHERE subdomain = ?',
      [teamSlug]
    );

    if (!redirect) {
      return errorResponse('Team not found', 404);
    }

    // Check if user exists
    const user = await queryOne<any>(
      'SELECT id FROM user_accounts WHERE email = ? AND tenant_id = ?',
      [email, redirect.tenant_id]
    );

    if (!user) {
      // For security, still return success (don't reveal if email exists)
      return successResponse({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenHash = hashPassword(resetToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token in database
    const tokenId = uuidv4();
    await execute(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [tokenId, user.id, resetTokenHash, expiresAt.toISOString()]
    );

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

    return successResponse({
      success: true,
      message: 'If an account with this email exists, a reset link has been sent',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return errorResponse('An error occurred', 500);
  }
}
