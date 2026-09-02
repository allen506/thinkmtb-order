import { getDb } from './db';
import crypto from 'crypto';

export interface PasswordlessToken {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/**
 * Generate a passwordless login token
 */
export function generateLoginToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a passwordless login token for a user
 */
export function createPasswordlessToken(
  tenantId: string,
  email: string,
  expiryMinutes: number = 15
): PasswordlessToken {
  const db = getDb();
  const id = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const token = generateLoginToken();

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  db.prepare(`
    INSERT INTO passwordless_tokens (id, tenant_id, email, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, tenantId, email, token, expiresAt.toISOString());

  return {
    id,
    tenant_id: tenantId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
    used_at: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Verify a passwordless login token
 */
export function verifyPasswordlessToken(tenantId: string, token: string): PasswordlessToken | null {
  const db = getDb();

  const tokenRecord = db.prepare(`
    SELECT * FROM passwordless_tokens 
    WHERE tenant_id = ? AND token = ? AND used_at IS NULL
  `).get(tenantId, token) as PasswordlessToken | undefined;

  if (!tokenRecord) {
    return null;
  }

  // Check if token has expired
  const expiryTime = new Date(tokenRecord.expires_at).getTime();
  const now = new Date().getTime();

  if (now > expiryTime) {
    return null; // Token expired
  }

  return tokenRecord;
}

/**
 * Mark a token as used
 */
export function usePasswordlessToken(tokenId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE passwordless_tokens 
    SET used_at = datetime('now') 
    WHERE id = ?
  `).run(tokenId);
}

/**
 * Generate a magic link URL
 */
export function generateMagicLinkUrl(baseUrl: string, tenantSlug: string, token: string): string {
  return `${baseUrl}/tenant/${tenantSlug}/login?magic=${token}`;
}

/**
 * Send passwordless login email (stub for testing)
 * In production, integrate with your email service (SendGrid, AWS SES, etc)
 */
export async function sendPasswordlessEmail(
  email: string,
  magicLink: string,
  tenantName: string
): Promise<boolean> {
  try {
    // For development/testing, log the magic link
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 Passwordless Login Link for ${email}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Link: ${magicLink}`);
    console.log(`${'='.repeat(60)}\n`);

    // In production, use SMTP_* env variables to send real email
    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME) {
      // TODO: Implement actual email sending with Nodemailer
      // For now, just log it
      console.log(`[SMTP] Email would be sent to: ${email}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send passwordless email:', error);
    return false;
  }
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): void {
  const db = getDb();
  db.prepare(`
    DELETE FROM passwordless_tokens 
    WHERE datetime(expires_at) < datetime('now')
  `).run();
}
