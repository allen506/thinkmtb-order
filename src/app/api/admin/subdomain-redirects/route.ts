import { NextRequest, NextResponse } from 'next/server';
import {
  getSubdomainRedirect,
  setSubdomainRedirect,
  getAllSubdomainRedirects,
  deleteSubdomainRedirect
} from '@/lib/tenant';

/**
 * Admin endpoint for managing subdomain redirects
 * GET - list all redirects
 * POST - create/update a redirect
 * DELETE - remove a redirect
 */

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    
    const redirects = getAllSubdomainRedirects();
    return NextResponse.json({ success: true, redirects });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch redirects', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    
    const body = await request.json();
    const { subdomain, redirect_url, is_team_portal, tenant_id, team_password } = body;

    if (!subdomain || !redirect_url) {
      return NextResponse.json(
        { error: 'Missing required fields: subdomain, redirect_url' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Don't allow reserved subdomains
    if (['www', 'mail', 'ftp', 'ns', 'admin', 'cmsadmin'].includes(subdomain)) {
      return NextResponse.json(
        { error: 'Reserved subdomain. Please choose a different name.' },
        { status: 400 }
      );
    }

    // If it's a team portal, make sure it has the required fields
    if (is_team_portal) {
      if (!tenant_id) {
        return NextResponse.json(
          { error: 'Team portals must have a tenant_id' },
          { status: 400 }
        );
      }
      // team_password is optional for team portals
    }

    const redirect = setSubdomainRedirect(
      subdomain,
      redirect_url,
      is_team_portal || false,
      tenant_id || null,
      team_password || null
    );

    return NextResponse.json({
      success: true,
      message: `Subdomain '${subdomain}' configured successfully`,
      redirect
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create redirect', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add authentication check
    
    const body = await request.json();
    const { subdomain } = body;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Missing required field: subdomain' },
        { status: 400 }
      );
    }

    const existing = getSubdomainRedirect(subdomain);
    if (!existing) {
      return NextResponse.json(
        { error: 'Subdomain not found' },
        { status: 404 }
      );
    }

    deleteSubdomainRedirect(subdomain);

    return NextResponse.json({
      success: true,
      message: `Subdomain '${subdomain}' deleted successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete redirect', details: String(error) },
      { status: 500 }
    );
  }
}
