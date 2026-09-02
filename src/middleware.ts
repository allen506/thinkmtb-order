import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract tenant from subdomain or path
 * 
 * Supports:
 * - thinkmtb.cmssportswear.us (subdomain)
 * - localhost:3000/tenant/thinkmtb (path - for local dev)
 * 
 * Note: Middleware runs in Edge Runtime and cannot access database.
 * Tenant verification happens in route handlers.
 */
export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Skip platform admin routes (not tenant-specific)
  if (pathname.startsWith('/platform-admin') || pathname.startsWith('/api/platform-admin')) {
    return NextResponse.next();
  }

  // Extract tenant from subdomain or path (no database access in Edge Runtime)
  let tenantSlug: string | null = null;

  // Try subdomain extraction first (production)
  // Example: thinkmtb.cmssportswear.us -> thinkmtb
  if (hostname && !hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
      tenantSlug = parts[0]; // First part is the subdomain
    }
  }

  // Try path extraction (local dev)
  // Example: localhost:3000/tenant/thinkmtb -> thinkmtb
  if (!tenantSlug && pathname.startsWith('/tenant/')) {
    const pathParts = pathname.split('/');
    if (pathParts.length >= 3) {
      tenantSlug = pathParts[2];
    }
  }

  // Add tenant to request headers for access in routes
  // Route handlers will verify tenant exists in database
  if (tenantSlug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-slug', tenantSlug);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

/**
 * Check if route is public (doesn't require tenant context)
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/api/health',
    '/login',
    '/register',
    '/forgot-password',
  ];

  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
