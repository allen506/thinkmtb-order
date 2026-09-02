import { getDb, initializeDatabase } from './db';

// Ensure database is initialized on first import
let dbInitialized = false;
if (!dbInitialized) {
  try {
    initializeDatabase();
    dbInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database in tenant module:', error);
  }
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  admin_email: string;
  status: 'active' | 'suspended';
  theme_color?: string;
  logo_url?: string;
  created_at: string;
}

export interface TenantAdmin {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'owner';
  created_at: string;
}

export interface TenantSettings {
  [key: string]: string | number | boolean;
}

/**
 * Get a tenant by ID
 */
export function getTenant(tenantId: string): Tenant | null {
  const db = getDb();
  return db.prepare('SELECT * FROM tenants WHERE id = ? AND status = ?').get(tenantId, 'active') as Tenant | undefined || null;
}

/**
 * Get a tenant by slug (for URL routing)
 */
export function getTenantBySlug(slug: string): Tenant | null {
  const db = getDb();
  let tenant = db.prepare('SELECT * FROM tenants WHERE slug = ? AND status = ?').get(slug, 'active') as Tenant | undefined || null;
  
  // If this is the default tenant and it doesn't exist, create it
  if (!tenant && slug === 'default') {
    try {
      console.log('📝 [getTenantBySlug] Creating missing default tenant...');
      const defaultTenantId = 'tenant_default';
      db.prepare(`
        INSERT OR IGNORE INTO tenants (id, name, slug, admin_email, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(defaultTenantId, 'Default Tenant', 'default', 'admin@default.local', 'active');
      console.log('✅ [getTenantBySlug] Default tenant created');
      
      // Try to fetch it again
      tenant = db.prepare('SELECT * FROM tenants WHERE slug = ? AND status = ?').get(slug, 'active') as Tenant | undefined || null;
    } catch (error) {
      console.error('❌ [getTenantBySlug] Error creating default tenant:', error);
    }
  }
  
  return tenant;
}

/**
 * Create a new tenant
 */
export function createTenant(
  name: string,
  slug: string,
  admin_email: string,
  admin_password_hash: string,
  admin_full_name: string
): Tenant {
  const db = getDb();
  const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const insertTenantStmt = db.prepare(`
    INSERT INTO tenants (id, name, slug, admin_email, status, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  
  insertTenantStmt.run(id, name, slug, admin_email, 'active');
  
  // Create owner admin
  const insertAdminStmt = db.prepare(`
    INSERT INTO tenant_admins (tenant_id, email, password_hash, full_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  
  insertAdminStmt.run(id, admin_email, admin_password_hash, admin_full_name, 'owner');
  
  // Copy default tenant settings
  initializeTenantSettings(id);
  
  return getTenant(id)!;
}

/**
 * Initialize default settings for a new tenant
 */
export function initializeTenantSettings(tenantId: string): void {
  const db = getDb();
  const defaults = {
    'club_name': tenantId,
    'ordering_active': '1',
    'payment_zelle': '',
    'payment_venmo': '',
    'payment_paypal': '',
    'payment_cash': 'Pay in person at the event or contact an admin.',
    'archive_retention_days': '365',
    'session_timeout_minutes': '15',
  };

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO tenant_settings (tenant_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  for (const [key, value] of Object.entries(defaults)) {
    insertStmt.run(tenantId, key, value);
  }
}

/**
 * Get all settings for a tenant
 */
export function getTenantSettings(tenantId: string): TenantSettings {
  const db = getDb();
  const rows = db.prepare(`
    SELECT key, value FROM tenant_settings WHERE tenant_id = ?
  `).all(tenantId) as { key: string; value: string }[];

  const settings: TenantSettings = {};
  for (const row of rows) {
    // Try to parse as JSON/number if possible
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

/**
 * Update a tenant setting
 */
export function updateTenantSetting(tenantId: string, key: string, value: string | number | boolean): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id, key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(tenantId, key, String(value), String(value));
}

/**
 * Get tenant admin by email
 */
export function getTenantAdmin(email: string): TenantAdmin | null {
  const db = getDb();
  return db.prepare('SELECT * FROM tenant_admins WHERE email = ?').get(email) as TenantAdmin | undefined || null;
}

/**
 * Get tenant admin by tenant ID and email
 */
export function getTenantAdminByTenantAndEmail(tenantId: string, email: string): TenantAdmin | null {
  const db = getDb();
  return db.prepare('SELECT * FROM tenant_admins WHERE tenant_id = ? AND email = ?').get(tenantId, email) as TenantAdmin | undefined || null;
}

/**
 * Get all admins for a tenant
 */
export function getTenantAdmins(tenantId: string): TenantAdmin[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tenant_admins WHERE tenant_id = ? ORDER BY created_at').all(tenantId) as TenantAdmin[];
}

/**
 * Add an admin to a tenant
 */
export function addTenantAdmin(
  tenantId: string,
  email: string,
  password_hash: string,
  full_name: string,
  role: 'admin' | 'owner' = 'admin'
): TenantAdmin {
  const db = getDb();
  const id = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  db.prepare(`
    INSERT INTO tenant_admins (id, tenant_id, email, password_hash, full_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, tenantId, email, password_hash, full_name, role);
  
  return getTenantAdminByTenantAndEmail(tenantId, email)!;
}

/**
 * Get all active tenants
 */
export function getAllTenants(): Tenant[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tenants WHERE status = ? ORDER BY created_at DESC').all('active') as Tenant[];
}

/**
 * Suspend a tenant
 */
export function suspendTenant(tenantId: string): void {
  const db = getDb();
  db.prepare('UPDATE tenants SET status = ? WHERE id = ?').run('suspended', tenantId);
}

/**
 * Get or create default tenant (for backward compatibility with single-tenant deployment)
 */
export function getOrCreateDefaultTenant(): Tenant {
  const db = getDb();
  let tenant = db.prepare('SELECT * FROM tenants WHERE slug = ?').get('default') as Tenant | undefined;
  
  if (!tenant) {
    // Create default tenant
    tenant = createTenant('Default Tenant', 'default', 'admin@default.local', '', 'Default Admin');
  }
  
  return tenant;
}

// Subdomain Redirect Functions

export interface SubdomainRedirect {
  id: number;
  subdomain: string;
  redirect_url: string;
  tenant_id: string | null;
  is_team_portal: number;
  team_password: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get subdomain redirect configuration
 */
export function getSubdomainRedirect(subdomain: string): SubdomainRedirect | null {
  const db = getDb();
  return db.prepare('SELECT * FROM subdomain_redirects WHERE subdomain = ?').get(subdomain) as SubdomainRedirect | undefined || null;
}

/**
 * Set a subdomain redirect
 */
export function setSubdomainRedirect(
  subdomain: string,
  redirect_url: string,
  is_team_portal: boolean = false,
  tenant_id: string | null = null,
  team_password: string | null = null
): SubdomainRedirect {
  const db = getDb();
  db.prepare(`
    INSERT INTO subdomain_redirects (subdomain, redirect_url, is_team_portal, tenant_id, team_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(subdomain) DO UPDATE SET
      redirect_url = ?,
      is_team_portal = ?,
      tenant_id = ?,
      team_password = ?,
      updated_at = datetime('now')
  `).run(
    subdomain, redirect_url, is_team_portal ? 1 : 0, tenant_id, team_password,
    redirect_url, is_team_portal ? 1 : 0, tenant_id, team_password
  );
  
  return getSubdomainRedirect(subdomain)!;
}

/**
 * Get all subdomain redirects
 */
export function getAllSubdomainRedirects(): SubdomainRedirect[] {
  const db = getDb();
  return db.prepare('SELECT * FROM subdomain_redirects ORDER BY created_at DESC').all() as SubdomainRedirect[];
}

/**
 * Delete a subdomain redirect
 */
export function deleteSubdomainRedirect(subdomain: string): void {
  const db = getDb();
  db.prepare('DELETE FROM subdomain_redirects WHERE subdomain = ?').run(subdomain);
}
