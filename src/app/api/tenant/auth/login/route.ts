import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { authenticateUser, getUserAccountByEmail } from '@/lib/user';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, teamPassword } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!email || !password || !tenantSlug) {
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

    // Authenticate user
    const user = authenticateUser(tenant.id, email, password, teamPassword);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email, password, or team password' },
        { status: 401 }
      );
    }

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, full_name: user.full_name } });
    
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
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
