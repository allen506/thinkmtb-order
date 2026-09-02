import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { createPasswordlessToken, sendPasswordlessEmail } from '@/lib/passwordless';
import { getUserAccountByEmail } from '@/lib/user';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!email || !tenantSlug) {
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

    // Check if user exists
    const user = getUserAccountByEmail(tenant.id, email);
    if (!user) {
      // For security, don't reveal if user exists
      // But in development, we could create the account
      // For now, return success anyway to prevent account enumeration
      return NextResponse.json(
        { 
          success: true,
          message: 'If an account exists with this email, a login link has been sent.'
        }
      );
    }

    // Generate passwordless token
    const tokenRecord = createPasswordlessToken(tenant.id, email, 15);

    // Generate magic link
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const magicLink = `${baseUrl}/tenant/${tenantSlug}/login?magic=${tokenRecord.token}`;

    // Send email with magic link
    const emailSent = await sendPasswordlessEmail(email, magicLink, tenant.name);

    // Return success (don't expose token to client for security)
    return NextResponse.json({
      success: true,
      message: 'Check your email for a login link. Link expires in 15 minutes.',
      // In development mode, return the token for testing
      ...(process.env.NODE_ENV !== 'production' && { token: tokenRecord.token }),
    });
  } catch (error) {
    console.error('Passwordless login error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
