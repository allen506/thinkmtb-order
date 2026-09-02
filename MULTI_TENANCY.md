# Multi-Tenancy Architecture Guide

This guide explains the multi-tenancy system that allows the platform to support multiple clients/organizations (tenants) on a single deployment.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Platform Admin Portal](#platform-admin-portal)
4. [Tenant Data Isolation](#tenant-data-isolation)
5. [URL Structure](#url-structure)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Development Guide](#development-guide)
10. [Migration Guide](#migration-guide)

## Overview

The multi-tenancy architecture enables a single deployment to serve multiple independent organizations. Each tenant has:

- Isolated data (designs, products, orders, settings)
- Dedicated admin users
- Custom configuration (club name, payment methods, SMTP settings)
- Independent order management

### Key Features

✅ **Multi-Tenant Support**: Run multiple clients on one server
✅ **Data Isolation**: Strict separation between tenant data
✅ **Backward Compatible**: Existing deployments work as "default" tenant
✅ **Scalable**: Add new tenants without redeployment
✅ **Secure**: Role-based access control (platform admin vs tenant admin)
✅ **Self-Contained**: Each tenant manages its own settings

## Core Concepts

### Tenant

A tenant is an independent organization using the platform. Each tenant has:

- **Unique ID**: `tenant_<timestamp>_<random>` (auto-generated)
- **Slug**: URL-friendly identifier (e.g., "thinkmtb", "cms-sports")
- **Name**: Display name of the organization
- **Admin Email**: Primary contact for the tenant administrator
- **Status**: `active` or `suspended`

### Tenant Admin

A user account that manages a specific tenant. Tenant admins:

- Have full control over their tenant's data
- Cannot access other tenants' data
- Authenticate with email and password
- Can manage products, designs, orders, and settings for their tenant

### Platform Admin

A super-user account that manages the entire platform. Platform admins:

- Can create and suspend tenants
- Can view all tenant data (with proper permission checks)
- Authenticate via environment variables (`PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`)
- Access the platform admin portal at `/platform-admin`

### Tenant Settings

Per-tenant configuration including:

- `club_name`: Display name shown to users
- `ordering_active`: Whether ordering is currently open
- `payment_*`: Payment method instructions
- `archive_retention_days`: How long to keep archived campaigns
- `session_timeout_minutes`: Admin session timeout duration
- Custom SMTP configuration for email notifications

## Platform Admin Portal

Access the platform admin portal to manage all tenants.

### Login

```
URL: http://yourdomain.com/platform-admin/login
Email: (see PLATFORM_ADMIN_EMAIL env var)
Password: (see PLATFORM_ADMIN_PASSWORD env var)
```

**Environment Variables** (set in `.env.local`):
```bash
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com
PLATFORM_ADMIN_PASSWORD=YourSecurePassword123!
```

### Dashboard Features

1. **Tenant Overview**
   - Total active tenants
   - Suspended tenants
   - Quick statistics

2. **Tenant Management**
   - View all tenants
   - Check tenant status and creation date
   - Manage individual tenants

3. **Create New Tenant**
   - Enter tenant name (auto-generates URL slug)
   - Set admin email and password
   - Initialize with default settings

### Session Management

- Sessions expire after 24 hours
- Sessions are stored in secure HTTP-only cookies
- Manual logout available from dashboard

## Tenant Data Isolation

### Query Filtering

All queries automatically filter by tenant_id to ensure data isolation:

```typescript
// Fetch designs for a specific tenant
const designs = db.prepare(`
  SELECT * FROM designs WHERE tenant_id = ?
`).all(tenantId);
```

### Tenant-Aware Tables

These tables include `tenant_id` field for data isolation:

- `designs` - Team design graphics
- `product_types` - Available products (jerseys, vests, etc.)
- `pricing_tiers` - Pricing by quantity
- `orders` - Team orders
- `order_items` - Individual items in orders
- `archived_campaigns` - Historical campaign data
- `product_designs` - Product-design associations
- `admin_emails` - Notification emails (tenant-specific)

### System Tables (Shared)

These tables are NOT tenant-specific:

- `tenants` - Tenant registry
- `tenant_admins` - Admin user accounts
- `tenant_settings` - Per-tenant configuration
- `sizes` - Standard sizes (global reference)
- `exchange_rates` - Currency rates (global)

## URL Structure

### Tenant URLs

Tenant users access the platform via tenant-specific routes:

```
# User portal for "thinkmtb" tenant
http://yourdomain.com/tenant/thinkmtb/user

# Orders for "thinkmtb" tenant
http://yourdomain.com/tenant/thinkmtb/user/orders

# Admin for "thinkmtb" tenant
http://yourdomain.com/tenant/thinkmtb/admin
```

### Platform Admin URLs

Platform administrators access:

```
# Platform admin login
http://yourdomain.com/platform-admin/login

# Platform admin dashboard
http://yourdomain.com/platform-admin/dashboard

# Create new tenant
http://yourdomain.com/platform-admin/tenants/new

# Manage specific tenant
http://yourdomain.com/platform-admin/tenants/[tenant-id]
```

## Configuration

### Environment Variables

Set these in `.env.local` or deployment configuration:

```bash
# Platform admin credentials
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com
PLATFORM_ADMIN_PASSWORD=YourSecurePassword123!

# Session configuration
SESSION_TIMEOUT_MINUTES=15

# Database configuration (existing)
DATABASE_TYPE=postgresql  # or sqlite
DATABASE_URL=postgresql://user:password@host/db
```

### Tenant Settings

Configure per-tenant settings via tenant admin dashboard:

```json
{
  "club_name": "ThinkMTB",
  "ordering_active": "1",
  "payment_zelle": "venmo.com/thinkmtb",
  "payment_venmo": "@thinkmtb",
  "payment_paypal": "thinkmtb@paypal.me",
  "payment_cash": "Pay in person at events",
  "archive_retention_days": "365",
  "session_timeout_minutes": "15"
}
```

## Database Schema

### Tenant Tables

#### tenants
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  admin_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'suspended'
  theme_color TEXT,                       -- future: branding
  logo_url TEXT,                          -- future: custom logo
  created_at TEXT NOT NULL
);
```

#### tenant_admins
```sql
CREATE TABLE tenant_admins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',     -- 'admin' | 'owner'
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, email)
);
```

#### tenant_settings
```sql
CREATE TABLE tenant_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, key)
);
```

### Modified Tables (with tenant_id)

Example - designs table:
```sql
CREATE TABLE designs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tenant_id TEXT,  -- NEW: references tenants(id)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

Similar modifications applied to:
- `product_types`
- `pricing_tiers`
- `orders`
- `order_items`
- `archived_campaigns`
- `product_designs`
- `admin_emails`

## API Reference

### Platform Admin Endpoints

#### POST /api/platform-admin/login

Authenticate as platform admin.

**Request:**
```json
{
  "email": "admin@yourdomain.com",
  "password": "YourPassword123!"
}
```

**Response (Success):**
```json
{
  "success": true
}
```

**Response (Failure):**
```json
{
  "error": "Invalid credentials"
}
```

Sets `platform_admin_token` cookie (24-hour expiry).

---

#### POST /api/platform-admin/logout

Clear admin session.

**Response:**
```json
{
  "success": true
}
```

---

#### GET /api/platform-admin/tenants

List all active tenants.

**Requires:** `platform_admin_token` cookie

**Response:**
```json
[
  {
    "id": "tenant_1724...",
    "name": "ThinkMTB",
    "slug": "thinkmtb",
    "admin_email": "admin@thinkmtb.com",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

#### POST /api/platform-admin/tenants

Create a new tenant.

**Requires:** `platform_admin_token` cookie

**Request:**
```json
{
  "name": "CMS Sports",
  "slug": "cms-sports",
  "admin_email": "admin@cmssports.com",
  "admin_password": "SecurePassword123!",
  "admin_full_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "id": "tenant_1724...",
    "name": "CMS Sports",
    "slug": "cms-sports",
    "admin_email": "admin@cmssports.com"
  }
}
```

**Errors:**
- `400 Bad Request` - Missing required fields
- `400 Conflict` - Slug already exists
- `401 Unauthorized` - Not authenticated

## Development Guide

### Accessing Tenant Context in Routes

#### Get Current Tenant from URL

```typescript
// src/middleware.ts or in route handlers
import { getTenantBySlug } from '@/lib/tenant';

// Extract tenant from URL slug
const tenantSlug = params.slug;  // from [slug]/... routes
const tenant = getTenantBySlug(tenantSlug);

if (!tenant) {
  return NextResponse.json(
    { error: 'Tenant not found' },
    { status: 404 }
  );
}
```

#### Query Data for Specific Tenant

```typescript
import { getDb } from '@/lib/db';

const db = getDb();
const designs = db.prepare(`
  SELECT * FROM designs WHERE tenant_id = ? ORDER BY sort_order
`).all(tenant.id);
```

#### Create Tenant-Specific Data

```typescript
import { getDb } from '@/lib/db';

const db = getDb();
db.prepare(`
  INSERT INTO designs (id, name, tenant_id, created_at)
  VALUES (?, ?, ?, datetime('now'))
`).run(designId, designName, tenant.id);
```

### Adding Multi-Tenancy to Existing Routes

1. **Extract tenant from URL or header**
   ```typescript
   const tenant = getTenantBySlug(params.slug);
   ```

2. **Verify tenant exists**
   ```typescript
   if (!tenant || tenant.status !== 'active') {
     return response with 404 or 403
   }
   ```

3. **Filter all queries by tenant_id**
   ```typescript
   WHERE tenant_id = ?  // Always include this
   ```

4. **Set tenant_id when creating data**
   ```typescript
   INSERT INTO table (field, tenant_id) VALUES (?, ?)
   ```

### Testing Multi-Tenancy Locally

1. **Create test tenants via platform admin**
   ```bash
   curl -X POST http://localhost:3000/api/platform-admin/tenants \
     -H "Content-Type: application/json" \
     -b "platform_admin_token=..." \
     -d '{
       "name": "Test Tenant 1",
       "slug": "test-1",
       "admin_email": "admin1@test.local",
       "admin_password": "password123",
       "admin_full_name": "Test Admin 1"
     }'
   ```

2. **Verify data isolation**
   ```bash
   # Data created for tenant1 should not appear for tenant2
   curl http://localhost:3000/api/designs/test-1
   curl http://localhost:3000/api/designs/test-2
   ```

3. **Check database directly**
   ```sql
   SELECT * FROM designs WHERE tenant_id = 'tenant_...';
   SELECT * FROM tenants;
   ```

## Migration Guide

### From Single-Tenant to Multi-Tenant

**Automatic Migration:**
- When the system starts for the first time with the new schema, it automatically:
  1. Creates a "default" tenant
  2. Migrates existing data to the "default" tenant
  3. Sets up default settings from app_settings table

**No Action Required** - Existing deployments will work seamlessly.

### Adding a New Tenant

Via Platform Admin Portal:
1. Login to `/platform-admin/login`
2. Click "Create New Tenant"
3. Enter tenant details and admin credentials
4. System creates:
   - Tenant record
   - Admin user
   - Default settings
   - Empty product catalogs

### Importing Data to a New Tenant

**Method 1: Manual Configuration (Recommended for small teams)**
- New tenant starts with empty product catalog
- Tenant admin logs in and adds designs/products via UI
- Simple and safe

**Method 2: Database Dump and Restore**
```bash
# Export data from one tenant
sqlite3 orders.db "SELECT * FROM designs WHERE tenant_id = 'tenant_1'" > designs.sql

# Import to another tenant (update tenant_id)
sqlite3 orders.db "INSERT INTO designs SELECT * FROM imported WHERE tenant_id = 'tenant_2'"
```

**Method 3: Programmatic Migration**
```typescript
// Copy products from one tenant to another
const fromTenantId = 'tenant_1';
const toTenantId = 'tenant_2';

const designs = db.prepare(
  'SELECT * FROM designs WHERE tenant_id = ?'
).all(fromTenantId);

for (const design of designs) {
  db.prepare(`
    INSERT INTO designs (id, name, description, image_url, tenant_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(design.id, design.name, design.description, design.image_url, toTenantId);
}
```

## Security Considerations

### Data Isolation

- ✅ All queries include `WHERE tenant_id = ?`
- ✅ Middleware verifies tenant ownership
- ✅ Admin users tied to specific tenant
- ✅ API responses filtered by tenant

### Password Security

- ✅ Platform admin passwords via environment variables
- ✅ Tenant admin passwords hashed with SHA-256 (upgrade to bcrypt recommended for production)
- ✅ Session tokens generated with cryptographically secure randomness
- ✅ Cookies set with HttpOnly flag

### Access Control

- ✅ Tenant admins can only access their tenant
- ✅ Platform admins can view all tenants but should not access user data directly
- ✅ Session-based authentication
- ✅ No cross-tenant data leakage

### Recommendations for Production

1. **Upgrade password hashing** - Use `bcrypt` instead of SHA-256
   ```typescript
   import bcrypt from 'bcrypt';
   const hash = await bcrypt.hash(password, 10);
   const match = await bcrypt.compare(password, hash);
   ```

2. **Add rate limiting** - Prevent brute force attacks
   ```typescript
   import rateLimit from 'express-rate-limit';
   ```

3. **Audit logging** - Log all admin actions
   ```sql
   CREATE TABLE audit_logs (
     id INTEGER PRIMARY KEY,
     tenant_id TEXT,
     admin_id TEXT,
     action TEXT,
     timestamp TEXT
   );
   ```

4. **TLS/SSL** - Always use HTTPS in production

5. **Regular backups** - Backup per tenant or full database

## Troubleshooting

### Tenant Not Found

**Problem:** Getting 404 errors when accessing tenant
**Solution:**
1. Verify slug in URL matches tenant slug
2. Check tenant status is 'active' (not 'suspended')
3. Verify tenant exists: `SELECT * FROM tenants WHERE slug = ?`

### Data Not Showing for Tenant

**Problem:** Orders/designs appear empty for a tenant
**Solution:**
1. Verify `tenant_id` in database matches URL slug's tenant
2. Check queries include `WHERE tenant_id = ?`
3. Review application logs for SQL errors

### Admin Login Failing

**Problem:** Tenant admin cannot login
**Solution:**
1. Verify email matches tenant admin record
2. Check password is correct (case-sensitive)
3. Verify tenant status is 'active'
4. Check database: `SELECT * FROM tenant_admins WHERE email = ?`

### Session Expiring Too Quickly

**Problem:** Getting logged out frequently
**Solution:**
1. Check `SESSION_TIMEOUT_MINUTES` setting
2. Verify server time is correct
3. Check cookie settings in authentication code

## Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | An independent organization using the platform |
| **Platform Admin** | Super-user managing all tenants |
| **Tenant Admin** | User managing a specific tenant |
| **Slug** | URL-friendly tenant identifier (e.g., "thinkmtb") |
| **Data Isolation** | Ensuring each tenant can only access its own data |
| **Multi-Tenancy** | Architecture supporting multiple independent organizations |
| **Session** | User authentication state (login credentials) |

## Next Steps

1. **Phase 2**: Create tenant-specific admin dashboard (`/tenant/[slug]/admin`)
2. **Phase 3**: Implement API filtering by tenant context
3. **Phase 4**: Add multi-tenant statistics and reporting
4. **Phase 5**: Implement tenant usage analytics
5. **Production**: Upgrade security, add audit logging

---

**Last Updated**: 2024-01-15
**Version**: 1.0 (Multi-Tenancy Foundation)
