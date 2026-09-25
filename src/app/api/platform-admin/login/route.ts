import { NextRequest, NextResponse } from 'next/server';
import {
  queryOne,
  successResponse,
  errorResponse,
  verifyPassword,
  createSessionToken,
  requirePlatformAdmin,
} from '@/lib/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    // Try to get admin from database
    const admin = await queryOne<any>(
      'SELECT id, password_hash FROM tenant_admins WHERE email = ?',
      [email]
    );

    if (admin && verifyPassword(password, admin.password_hash)) {
      // Valid credentials - create session
      const token = createSessionToken();
      const response = successResponse({ success: true });
      response.cookies.set('platform_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      });
      return response;
    }

    // Fall back to environment variable credentials (for first login / emergency)
    const ENV_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
    const ENV_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'ChangeMe123!';

    if (email === ENV_ADMIN_EMAIL && password === ENV_ADMIN_PASSWORD) {
      const token = createSessionToken();
      const response = successResponse({ success: true });
      response.cookies.set('platform_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
      return response;
    }

    return errorResponse('Invalid credentials', 401);
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('An error occurred', 500);
  }
}
