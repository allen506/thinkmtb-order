/**
 * Rate Limiting Utility
 * Prevents brute force and DoS attacks by limiting login attempts per IP
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

// In-memory store for rate limiting
// In production, consider using Redis or a database
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
};

/**
 * Get client IP from request
 * Handles X-Forwarded-For header (for proxies/load balancers)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  
  // Fallback
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Check if IP is rate limited
 * Returns { allowed: boolean, remaining: number, resetTime: Date | null }
 */
export function checkRateLimit(
  ip: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: Date | null;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // No entry = first attempt
  if (!entry) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime: null,
    };
  }

  // Check if blocked
  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(entry.blockedUntil),
    };
  }

  // Unblock if time has passed
  if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
    rateLimitStore.delete(ip);
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime: null,
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.delete(ip);
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime: null,
    };
  }

  // Within window, check if at limit
  const remaining = Math.max(
    0,
    RATE_LIMIT_CONFIG.maxAttempts - entry.attempts
  );

  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    // Block this IP
    entry.blocked = true;
    entry.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
    rateLimitStore.set(ip, entry);

    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(entry.blockedUntil),
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime: new Date(entry.lastAttempt + RATE_LIMIT_CONFIG.windowMs),
  };
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    rateLimitStore.set(ip, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
    });
  } else {
    // If window expired, reset
    if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
      rateLimitStore.set(ip, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      });
    } else {
      entry.attempts += 1;
      entry.lastAttempt = now;
      rateLimitStore.set(ip, entry);
    }
  }
}

/**
 * Record a successful login (clears attempt counter)
 */
export function recordSuccessfulLogin(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Cleanup old entries (run periodically)
 * Removes entries older than 30 minutes
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.lastAttempt > maxAge) {
      rateLimitStore.delete(ip);
    }
  }
}

// Cleanup periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
