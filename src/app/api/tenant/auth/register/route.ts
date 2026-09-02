import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant';
import { createUserAccount, getUserAccountByEmail } from '@/lib/user';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, teamPassword } = await request.json();
    const tenantSlug = request.headers.get('x-tenant-slug');

    if (!full_name || !email || !password || !tenantSlug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Check if user already exists
    const existing = getUserAccountByEmail(tenant.id, email);
    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Validate team password if required
    const db = getDb();
    const teamPasswordSetting = db.prepare(
      'SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?'
    ).get(tenant.id, 'team_password') as { value: string } | undefined;

    if (teamPasswordSetting && teamPasswordSetting.value && teamPasswordSetting.value !== teamPassword) {
      return NextResponse.json(
        { error: 'Invalid team password' },
        { status: 401 }
      );
    }

    // Create user account
    const user = createUserAccount(tenant.id, email, password, full_name);

    return NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email, full_name: user.full_name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
