import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('platform_admin_token');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDb();
    const tenants = db.prepare(
      'SELECT id, name, slug, admin_email, status, created_at FROM tenants ORDER BY created_at DESC'
    ).all();

    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('platform_admin_token');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, slug, admin_email, admin_password, admin_full_name } = await request.json();

    if (!name || !slug || !admin_email || !admin_password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Check if slug already exists
    const existing = db.prepare('SELECT id FROM tenants WHERE slug = ?').get(slug);
    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // Create tenant
    const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = require('crypto').createHash('sha256').update(admin_password).digest('hex');

    db.prepare(`
      INSERT INTO tenants (id, name, slug, admin_email, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(id, name, slug, admin_email, 'active');

    // Create owner admin
    const adminId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO tenant_admins (id, tenant_id, email, password_hash, full_name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(adminId, id, admin_email, passwordHash, admin_full_name || admin_email, 'owner');

    // Initialize default settings
    const defaults = {
      'club_name': name,
      'ordering_active': '1',
      'payment_zelle': '',
      'payment_venmo': '',
      'payment_paypal': '',
      'payment_cash': 'Pay in person at the event or contact an admin.',
      'archive_retention_days': '365',
      'session_timeout_minutes': '15',
    };

    const insertSetting = db.prepare(`
      INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(id, key, value);
    }

    return NextResponse.json(
      { success: true, tenant: { id, name, slug, admin_email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
