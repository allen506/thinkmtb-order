import { NextRequest } from 'next/server';
import { queryOne, errorResponse, successResponse } from '@/lib/route-helpers';

/**
 * Verify team password
 * POST /api/tenant/verify-password
 * Body: { teamSlug, teamPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, teamPassword } = await request.json();

    if (!teamSlug || !teamPassword) {
      return errorResponse('Team slug and password are required', 400);
    }

    // Get subdomain config from database
    const redirect = await queryOne<any>(
      'SELECT tenant_id, team_password FROM subdomain_redirects WHERE subdomain = ?',
      [teamSlug]
    );

    if (!redirect) {
      return errorResponse('Team not found', 404);
    }

    // Verify team password
    if (redirect.team_password !== teamPassword) {
      return errorResponse('Invalid team password', 401);
    }

    return successResponse({
      success: true,
      message: 'Team password verified',
      teamId: redirect.tenant_id,
    });
  } catch (error) {
    console.error('Team password verification error:', error);
    return errorResponse('Failed to verify team password', 500);
  }
}
