import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Verify team password
 * POST /api/tenant/verify-password
 * Body: { teamSlug, teamPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, teamPassword } = await request.json();

    if (!teamSlug || !teamPassword) {
      return NextResponse.json(
        { error: 'Team slug and password are required' },
        { status: 400 }
      );
    }

    // Get subdomain config from database
    const db = getDb();
    const redirect = db
      .prepare('SELECT * FROM subdomain_redirects WHERE subdomain = ?')
      .get(teamSlug) as any;

    if (!redirect) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Verify team password
    if (redirect.team_password !== teamPassword) {
      return NextResponse.json(
        { error: 'Invalid team password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team password verified',
      teamId: redirect.tenant_id,
    });
  } catch (error) {
    console.error('Team password verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify team password' },
      { status: 500 }
    );
  }
}
