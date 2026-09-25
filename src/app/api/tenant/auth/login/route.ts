import { NextRequest } from 'next/server';
import {
  queryOne,
  errorResponse,
  successResponse,
  createSessionToken,
  verifyPassword,
} from '@/lib/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, teamPassword } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!email || !password || !tenantSlug) {
      return errorResponse('Missing required fields', 400);
    }

    // Get tenant by slug
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // Get user account by email
    const user = await queryOne<any>(
      `SELECT id, email, password_hash, full_name, team_id 
       FROM user_accounts 
       WHERE tenant_id = ? AND email = ?`,
      [tenant.id, email]
    );

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return errorResponse('Invalid email or password', 401);
    }

    // Create session token
    const token = createSessionToken();
    const response = successResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        team_id: user.team_id,
      },
    });

    response.cookies.set('tenant_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('tenant_user_id', user.id, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('An error occurred', 500);
  }
}
