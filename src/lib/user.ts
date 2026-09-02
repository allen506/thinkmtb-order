import { getDb } from './db';
import crypto from 'crypto';

export interface UserAccount {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  verified: number;
  created_at: string;
}

/**
 * Hash password
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create a new user account for a tenant
 */
export function createUserAccount(
  tenantId: string,
  email: string,
  password: string,
  fullName: string
): UserAccount {
  const db = getDb();
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO user_accounts (id, tenant_id, email, password_hash, full_name, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, tenantId, email, passwordHash, fullName, 0);

  return getUserAccountById(id)!;
}

/**
 * Get user account by ID
 */
export function getUserAccountById(id: string): UserAccount | null {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM user_accounts WHERE id = ?'
  ).get(id) as UserAccount | undefined || null;
}

/**
 * Get user account by email and tenant
 */
export function getUserAccountByEmail(tenantId: string, email: string): UserAccount | null {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM user_accounts WHERE tenant_id = ? AND email = ?'
  ).get(tenantId, email) as UserAccount | undefined || null;
}

/**
 * Authenticate user (email + password + team password)
 */
export function authenticateUser(
  tenantId: string,
  email: string,
  password: string,
  teamPassword?: string
): UserAccount | null {
  const db = getDb();
  
  // Check if team password is required and correct
  if (teamPassword !== undefined) {
    const settings = db.prepare(
      'SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?'
    ).get(tenantId, 'team_password') as { value: string } | undefined;

    if (settings && settings.value && settings.value !== teamPassword) {
      return null; // Wrong team password
    }
  }

  // Check user credentials
  const user = getUserAccountByEmail(tenantId, email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return user;
}

/**
 * Get all users for a tenant
 */
export function getTenantUsers(tenantId: string): UserAccount[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM user_accounts WHERE tenant_id = ? ORDER BY created_at DESC'
  ).all(tenantId) as UserAccount[];
}

/**
 * Update user profile
 */
export function updateUserProfile(userId: string, fullName: string): void {
  const db = getDb();
  db.prepare(
    'UPDATE user_accounts SET full_name = ? WHERE id = ?'
  ).run(fullName, userId);
}

/**
 * Change user password
 */
export function changeUserPassword(userId: string, newPassword: string): void {
  const db = getDb();
  const passwordHash = hashPassword(newPassword);
  db.prepare(
    'UPDATE user_accounts SET password_hash = ? WHERE id = ?'
  ).run(passwordHash, userId);
}

/**
 * Delete user account
 */
export function deleteUserAccount(userId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM user_accounts WHERE id = ?').run(userId);
}

/**
 * Verify user email (mark as verified)
 */
export function verifyUserEmail(userId: string): void {
  const db = getDb();
  db.prepare(
    'UPDATE user_accounts SET verified = 1 WHERE id = ?'
  ).run(userId);
}
