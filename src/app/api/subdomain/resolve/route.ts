import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from '@/lib/subdomain';
import { getSubdomainRedirect } from '@/lib/tenant';

/**
 * Resolve subdomain - returns either a redirect URL or team portal info
 */
export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || '';
    const subdomain = extractSubdomain(hostname);

    // Special case: cmsadmin subdomain
    if (subdomain === 'cmsadmin') {
      return NextResponse.json({
        type: 'admin',
        redirect: '/admin',
        message: 'Redirecting to admin dashboard'
      });
    }

    // Check if this is a configured subdomain
    if (subdomain) {
      const config = getSubdomainRedirect(subdomain);
      
      if (config) {
        if (config.is_team_portal) {
          // This is a team portal - return team login info
          return NextResponse.json({
            type: 'team',
            subdomain,
            tenant_id: config.tenant_id,
            requires_password: !!config.team_password,
            redirect: `/tenant/${subdomain}/login`,
            message: 'Team portal detected'
          });
        } else {
          // This is a redirect
          return NextResponse.json({
            type: 'redirect',
            subdomain,
            redirect_url: config.redirect_url,
            message: 'External redirect configured'
          });
        }
      }
    }

    // Unknown subdomain - show available options
    return NextResponse.json({
      type: 'unknown',
      subdomain,
      message: 'Subdomain not configured',
      hint: 'Try cmsadmin.cmssportswear.us for admin access'
    }, { status: 404 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to resolve subdomain', details: String(error) },
      { status: 500 }
    );
  }
}
