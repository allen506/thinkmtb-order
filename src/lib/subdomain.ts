/**
 * Subdomain detection and routing utilities
 */

export function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null;
  
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Split by dots
  const parts = host.split('.');
  
  // If we have cmssportswear.us (2 parts), no subdomain
  if (parts.length <= 2) {
    return null;
  }
  
  // Return everything before the last two parts (domain.tld)
  return parts.slice(0, -2).join('.');
}

export type SubdomainType = 'admin' | 'team' | 'redirect' | 'unknown';

export function classifySubdomain(subdomain: string | null): SubdomainType {
  if (!subdomain) return 'unknown';
  if (subdomain === 'cmsadmin') return 'admin';
  if (subdomain === 'www' || subdomain === '') return 'unknown';
  return 'team'; // Any other subdomain could be a team portal or redirect
}

export function getHostname(request: Request): string {
  return request.headers.get('host') || '';
}

export function getSubdomainFromRequest(request: Request): string | null {
  const hostname = getHostname(request);
  return extractSubdomain(hostname);
}

export function classifyRequestSubdomain(request: Request): SubdomainType {
  const subdomain = getSubdomainFromRequest(request);
  return classifySubdomain(subdomain);
}
