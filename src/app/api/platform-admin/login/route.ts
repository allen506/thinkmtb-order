import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// Hash password helper
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password helper
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const admin = db.prepare(
      'SELECT * FROM tenant_admins WHERE email = ?'
    ).get(email) as any;

    if (!admin) {
      // For first login, check against environment variable or hardcoded credential
      const ENV_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
      const ENV_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'ChangeMe123!';

      if (email === ENV_ADMIN_EMAIL && password === ENV_ADMIN_PASSWORD) {
        // Create session token
        const token = crypto.randomBytes(32).toString('hex');
        const response = NextResponse.json({ success: true });
        response.cookies.set('platform_admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
        });
        return response;
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password against stored hash
    if (!verifyPassword(password, admin.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const response = NextResponse.json({ success: true });
    response.cookies.set('platform_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
