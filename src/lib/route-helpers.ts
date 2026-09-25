/**
 * Route Handler Helper for Async Database Operations
 * Simplifies the pattern of converting sync endpoints to async
 */

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction, TransactionClient } from "./db-async";

export interface RouteContext {
  tenantSlug: string;
  userId: string | null;
  userRole: string | null;
  request: NextRequest;
}

/**
 * Extract context from request headers
 */
export function extractContext(request: NextRequest): RouteContext {
  return {
    tenantSlug: request.headers.get("x-tenant-slug") || "default",
    userId: request.headers.get("x-user-id"),
    userRole: request.headers.get("x-user-role"),
    request,
  };
}

/**
 * Require authentication
 */
export function requireAuth(context: RouteContext): { error: string } | null {
  if (!context.userId) {
    return { error: "User ID required" };
  }
  return null;
}

/**
 * Require admin role
 */
export function requireAdmin(context: RouteContext): { error: string } | null {
  if (context.userRole !== "admin") {
    return { error: "Admin role required" };
  }
  return null;
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Wrapper for GET handlers with automatic error handling
 */
export async function getHandler(
  handler: (context: RouteContext) => Promise<NextResponse>
) {
  return async function (request: NextRequest, context?: any) {
    try {
      const ctx = extractContext(request);
      return await handler(ctx);
    } catch (error) {
      console.error("Handler error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}

/**
 * Wrapper for POST/PUT/DELETE handlers with automatic error handling
 */
export async function mutationHandler(
  handler: (request: NextRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async function (request: NextRequest, routeContext?: any) {
    try {
      const ctx = extractContext(request);
      return await handler(request, ctx);
    } catch (error) {
      console.error("Handler error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}

/**
 * Platform admin authentication check
 */
export function requirePlatformAdmin(request: NextRequest): { error: string } | null {
  const token = request.cookies.get("platform_admin_token");
  if (!token) {
    return { error: "Unauthorized" };
  }
  return null;
}

/**
 * Hash password for storage
 */
export function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create secure session cookie token
 */
export function createSessionToken(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Convenience exports for database operations
 */
export { query, queryOne, execute, withTransaction };
export type { TransactionClient };
