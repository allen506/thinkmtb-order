import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract tenant from path-based routing
 * 
 * Supports:
 * - /custom/thinkmtb (production path-based)
 * - /{slug} (catch-all for tenant pages)
 * 
 * Note: Middleware runs in Edge Runtime and cannot access database.
 * Tenant verification happens in route handlers.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip platform admin routes (not tenant-specific)
  if (pathname.startsWith('/platform-admin') || pathname.startsWith('/api/platform-admin')) {
    return NextResponse.next();
  }

  // Skip public routes
  if (pathname === '/' || pathname.startsWith('/api/') || 
      pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Extract tenant from path-based routing
  let tenantSlug: string | null = null;

  // Try /custom/[slug] pattern first (production path-based)
  // Example: /custom/thinkmtb -> thinkmtb
  if (pathname.startsWith('/custom/')) {
    const pathParts = pathname.split('/');
    if (pathParts.length >= 3) {
      tenantSlug = pathParts[2];
    }
  }

  // Try /{slug} pattern for tenant pages (catch-all for login, register, etc.)
  // This handles routes like /thinkmtb/login
  // But skip known non-tenant routes
  if (!tenantSlug && !isPublicRoute(pathname)) {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const firstSegment = pathParts[0];
      // Skip known non-tenant first segments
      if (!['admin', 'user', 'designs', 'products', 'tenant', 'final-designs'].includes(firstSegment)) {
        tenantSlug = firstSegment;
      }
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
