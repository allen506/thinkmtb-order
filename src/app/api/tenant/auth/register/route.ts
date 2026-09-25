import { NextRequest } from 'next/server';
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  hashPassword,
} from '@/lib/route-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, teamPassword } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!full_name || !email || !password || !tenantSlug) {
      return errorResponse('Missing required fields', 400);
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400);
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // Check if user already exists
    const existing = await queryOne<any>(
      'SELECT id FROM user_accounts WHERE tenant_id = ? AND email = ?',
      [tenant.id, email]
    );

    if (existing) {
      return errorResponse('Email already in use', 400);
    }

    // Validate team password if required
    const teamPasswordSetting = await queryOne<{ value: string }>(
      'SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?',
      [tenant.id, 'team_password']
    );

    if (teamPasswordSetting?.value && teamPasswordSetting.value !== teamPassword) {
      return errorResponse('Invalid team password', 401);
    }

    // Create user account
    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    await execute(
      `INSERT INTO user_accounts (id, tenant_id, email, password_hash, full_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, tenant.id, email, passwordHash, full_name, 'user']
    );

    return successResponse(
      {
        success: true,
        user: { id: userId, email, full_name },
      },
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('An error occurred', 500);
  }
}
