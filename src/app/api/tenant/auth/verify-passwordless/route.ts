import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { verifyPasswordlessToken, usePasswordlessToken } from '@/lib/passwordless';
import { getUserAccountByEmail } from '@/lib/user';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!token || !tenantSlug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const tenant = getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify token
    const tokenRecord = verifyPasswordlessToken(tenant.id, token);
    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired login link' },
        { status: 401 }
      );
    }

    // Get user by email
    const user = getUserAccountByEmail(tenant.id, tokenRecord.email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark token as used
    usePasswordlessToken(tokenRecord.id);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      },
    });

    // Set session cookies
    response.cookies.set('tenant_session', sessionToken, {
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
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
