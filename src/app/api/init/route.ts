import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Initialize database with default tenant
 * This endpoint should be called after deployment to set up the default tenant
 * GET /api/init - Check if initialized
 * POST /api/init - Force initialization
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const tenantCount = db.prepare('SELECT COUNT(*) as count FROM tenants WHERE slug = ?').get('default') as { count: number };
    
    if (tenantCount && tenantCount.count > 0) {
      return NextResponse.json({ 
        status: 'initialized',
        message: 'Default tenant already exists',
        tenantCount: tenantCount.count 
      });
    } else {
      return NextResponse.json({ 
        status: 'not_initialized',
        message: 'Default tenant does not exist. Call POST /api/init to initialize.'
      });
    }
  } catch (error) {
    console.error('Init check error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: String(error) 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    
    // Check if default tenant already exists
    const existing = db.prepare('SELECT * FROM tenants WHERE slug = ?').get('default');
    if (existing) {
      return NextResponse.json({ 
        status: 'success',
        message: 'Default tenant already exists',
        tenant: existing
      });
    }
    
    // Create default tenant
    console.log('📝 [/api/init] Creating default tenant...');
    const result = db.prepare(`
      INSERT INTO tenants (id, name, slug, admin_email, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('tenant_default', 'Default Tenant', 'default', 'admin@default.local', 'active');
    
    console.log('✅ [/api/init] Insert result:', result);
    
    // Verify it was created
    const created = db.prepare('SELECT * FROM tenants WHERE slug = ?').get('default');
    console.log('✅ [/api/init] Verification:', created);
    
    if (!created) {
      return NextResponse.json({ 
        status: 'error',
        error: 'Tenant was not created - verification failed'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Default tenant created successfully',
      tenant: created
    });
  } catch (error) {
    console.error('❌ [/api/init] Initialization error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: String(error)
    }, { status: 500 });
  }
}
