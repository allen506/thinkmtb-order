import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy all /api/cmsadmin/* requests to /api/admin/*
 * This allows consolidating admin API access under cmsadmin namespace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const route = params.route?.join('/') || '';
  const adminUrl = `/api/admin/${route}`;
  
  // Forward to admin route
  const response = await fetch(new URL(adminUrl, request.url), {
    method: 'GET',
    headers: request.headers,
  });

  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const route = params.route?.join('/') || '';
  const adminUrl = `/api/admin/${route}`;
  
  const body = await request.text();
  const response = await fetch(new URL(adminUrl, request.url), {
    method: 'POST',
    headers: request.headers,
    body: body || undefined,
  });

  return response;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const route = params.route?.join('/') || '';
  const adminUrl = `/api/admin/${route}`;
  
  const body = await request.text();
  const response = await fetch(new URL(adminUrl, request.url), {
    method: 'PATCH',
    headers: request.headers,
    body: body || undefined,
  });

  return response;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const route = params.route?.join('/') || '';
  const adminUrl = `/api/admin/${route}`;
  
  const response = await fetch(new URL(adminUrl, request.url), {
    method: 'DELETE',
    headers: request.headers,
  });

  return response;
}
