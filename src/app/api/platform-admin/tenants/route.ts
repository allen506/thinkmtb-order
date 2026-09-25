import { NextRequest } from 'next/server';
import {
  query,
  queryOne,
  execute,
  withTransaction,
  errorResponse,
  successResponse,
  requirePlatformAdmin,
  hashPassword,
} from '@/lib/route-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    const tenants = await query<any>(
      `SELECT id, name, slug, created_at 
       FROM tenants 
       ORDER BY created_at DESC`
    );

    return successResponse(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    return errorResponse('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    const { name, slug, admin_email, admin_password, admin_full_name } = await request.json();

    if (!name || !slug || !admin_email || !admin_password) {
      return errorResponse('Missing required fields', 400);
    }

    // Check if slug already exists
    const existing = await queryOne<any>(
      'SELECT id FROM tenants WHERE slug = ?',
      [slug]
    );
    if (existing) {
      return errorResponse('Slug already exists', 400);
    }

    return await withTransaction(async (client) => {
      // Create tenant
      const tenantId = uuidv4();
      await execute(
        `INSERT INTO tenants (id, slug, name, created_at)
         VALUES (?, ?, ?, NOW())`,
        [tenantId, slug, name]
      );

      // Create tenant admin
      const adminId = uuidv4();
      const passwordHash = hashPassword(admin_password);
      await execute(
        `INSERT INTO tenant_admins (id, tenant_id, email, password_hash, full_name, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [adminId, tenantId, admin_email, passwordHash, admin_full_name || admin_email, 'owner', 'active']
      );

      // Initialize default settings
      const defaults: Record<string, string> = {
        'club_name': name,
        'ordering_active': '1',
        'payment_zelle': '',
        'payment_venmo': '',
        'payment_paypal': '',
        'payment_cash': 'Pay in person at the event or contact an admin.',
        'archive_retention_days': '365',
        'session_timeout_minutes': '15',
      };

      for (const [key, value] of Object.entries(defaults)) {
        const settingId = uuidv4();
        await execute(
          `INSERT INTO tenant_settings (id, tenant_id, key, value, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [settingId, tenantId, key, value]
        );
      }

      return successResponse(
        { success: true, tenant: { id: tenantId, name, slug, admin_email } },
        201
      );
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    return errorResponse('An error occurred', 500);
  }
}
