# SaaS Platform - Complete Implementation Guide

This guide covers the complete SaaS platform architecture with multi-tenant support, user accounts, team passwords, and global administration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Subdomain Setup](#subdomain-setup)
3. [User Account System](#user-account-system)
4. [Team Password Protection](#team-password-protection)
5. [Global Admin Portal](#global-admin-portal)
6. [Email System](#email-system)
7. [Deployment Guide](#deployment-guide)
8. [DNS Configuration](#dns-configuration)
9. [Environment Variables](#environment-variables)

## Architecture Overview

### System Diagram

```
Internet Users
    ↓
DNS (*.cmssportswear.us → VPS IP)
    ↓
Subdomain Routing (Middleware)
    ↓
┌─────────────────────────────────────────────────┐
│         SaaS Platform (Single Deployment)       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Platform Admin Portal (/platform-admin)       │
│  ├── Manage tenants                            │
│  ├── View global statistics                    │
│  ├── Manage campaigns                          │
│  ├── Backup/restore/archive                    │
│  ├── Send notifications to clients             │
│  └── SMTP settings (global)                    │
│                                                 │
│  Tenant Portals (thinkmtb.cmssportswear.us)   │
│  ├── User login/register                       │
│  ├── Team password validation                  │
│  ├── Tenant-specific branding                  │
│  └── Place orders (team members only)          │
│                                                 │
│  Databases                                     │
│  ├── Tenants (registry)                        │
│  ├── Tenant Settings (per-tenant config)       │
│  ├── User Accounts (email/password)            │
│  ├── Tenant Data (orders, designs, products)   │
│  └── Global Settings (SMTP, etc.)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Owner |
|-----------|---------|-------|
| Platform Admin | Manage all tenants, campaigns, email | You (Super Admin) |
| Tenant Portal | User-facing portal for each team | Team members (Users) |
| User Accounts | Email/password login per team | Team members |
| Team Password | Optional security layer | Tenant Admin sets |
| Global SMTP | Send emails to all clients | Platform Admin only |

## Subdomain Setup

### How It Works

The system automatically routes subdomains to tenant portals:

```
thinkmtb.cmssportswear.us
├─ /                    → Tenant portal home
├─ /login               → User login
├─ /register            → User registration
├─ /dashboard           → User dashboard (after login)
├─ /orders              → User's orders
└─ /admin/{tenantId}    → Tenant admin panel (Phase 2)

admin.cmssportswear.us
└─ /platform-admin      → Global admin portal
```

### DNS Records Required

At GoDaddy (or your DNS provider):

```
Type: CNAME
Name: *.cmssportswear.us
Value: yourvps.ip.address  (or your VPS's A record)

Type: A
Name: cmssportswear.us
Value: 74.208.132.71  (your VPS IP)
```

**Result**: All subdomains point to your VPS, middleware extracts tenant from subdomain

### Middleware Flow

```typescript
// Extracts tenant from subdomain or path
thinkmtb.cmssportswear.us  → x-tenant-slug: "thinkmtb"
                               x-tenant-id: "tenant_123..."

// Fallback for local dev
localhost:3000/tenant/thinkmtb → x-tenant-slug: "thinkmtb"
                                   x-tenant-id: "tenant_123..."
```

## User Account System

### User Account Tables

#### user_accounts

```sql
CREATE TABLE user_accounts (
  id TEXT PRIMARY KEY,          -- user_123_abc...
  tenant_id TEXT NOT NULL,      -- Which tenant
  email TEXT NOT NULL,          -- user@example.com
  password_hash TEXT NOT NULL,  -- SHA-256 hash
  full_name TEXT NOT NULL,      -- Display name
  verified INTEGER DEFAULT 0,   -- Email verified
  created_at TEXT,              -- When created
  UNIQUE(tenant_id, email)
);
```

### User Registration Flow

1. User clicks "Create Account" on tenant portal
2. User enters: Full Name, Email, Password, (Optional) Team Password
3. System validates:
   - Email not already registered for this tenant
   - Password ≥ 8 characters
   - Team password (if required)
4. Account created with status: `verified = 0`
5. Optional: Send verification email (Phase 2)
6. Redirect to login

### User Login Flow

1. User clicks "Sign In" on tenant portal
2. User enters: Email, Password
3. System checks:
   - User exists in this tenant
   - Password correct
4. If team password required:
   - Display team password field
   - Validate team password
5. Create session cookie (7-day expiry)
6. Redirect to dashboard

### Database Schema

```typescript
// Create user account
const user = createUserAccount(
  tenantId,
  email,
  password,
  fullName
);

// Authenticate user
const user = authenticateUser(
  tenantId,
  email,
  password,
  teamPassword  // optional
);

// Get user by email
const user = getUserAccountByEmail(tenantId, email);
```

## Team Password Protection

### Purpose

- Prevents outsiders from creating accounts for teams
- Adds optional security layer per team
- Configured by tenant admin in settings

### Configuration

**Option 1: No Team Password (Anyone can register)**
```
tenant_settings: { key: 'team_password', value: '' }
```

**Option 2: Team Password Required**
```
tenant_settings: { key: 'team_password', value: 'secretteampass' }
```

### User Experience

**Without Team Password:**
- Registration form: (Email, Password, Full Name)
- Login form: (Email, Password)

**With Team Password:**
- Registration form: (Email, Password, Full Name, **Team Password**)
- Login form: (Email, Password, **Team Password**)

### Implementation

```typescript
// When validating registration
if (teamPassword !== settingValue) {
  return error('Invalid team password');
}

// When validating login
const user = authenticateUser(
  tenantId,
  email,
  password,
  teamPassword  // Checked inside function
);
```

## Global Admin Portal

The global admin portal (you) manages the entire platform.

### Features

#### 1. Tenant Management
- View all tenants and their status
- Create new tenants
- Suspend/unsuspend tenants
- View tenant statistics (# users, # orders, revenue)

#### 2. Campaign Management (Global View)
- View open campaigns across all tenants
- Create new campaigns (affects specific tenant)
- Open/close campaigns for all tenants simultaneously
- Campaign analytics by tenant

#### 3. Order Management
- View all orders from all tenants
- Search orders by tenant, user, date range
- View order status and payment status
- Export orders to CSV

#### 4. Backup & Restore
- Automatic daily backups
- View backup history
- Restore from specific backup
- Per-tenant or full database backups

#### 5. Archive Management
- Archive campaigns (auto-triggered after retention period)
- View archived campaigns
- Delete old archives (cleanup)
- Archive analytics

#### 6. Email / Communications
- Send global notifications to all tenants
- Send notifications to specific tenant
- Email templates (campaign opening, reminder, closing)
- SMTP settings (centralized)

#### 7. Statistics & Reports
- Dashboard with key metrics
- Revenue tracking by tenant
- User growth charts
- Order volume trends

### URL Structure

```
/platform-admin                  → Dashboard (main)
/platform-admin/login           → Login page
/platform-admin/tenants         → List all tenants
/platform-admin/tenants/new     → Create tenant
/platform-admin/orders          → View all orders
/platform-admin/campaigns       → Manage campaigns
/platform-admin/backups         → Backup/restore
/platform-admin/email           → Send notifications
/platform-admin/settings        → Platform settings
```

### Access Control

- Platform admin authenticates via: Email + Password (env vars)
- Session cookie: `platform_admin_token` (24-hour expiry)
- All global admin routes protected by middleware

## Email System

### Architecture

**Key Point**: Only platform admin sends emails via centralized SMTP

```
Platform Admin Settings
    ↓
Global SMTP Configuration (single)
    ↓
Email Queue (background job - Phase 2)
    ↓
Send to Users (via email template)
```

### SMTP Configuration

Stored in `app_settings`:
```typescript
{
  key: 'smtp_host',
  key: 'smtp_port',
  key: 'smtp_secure',
  key: 'smtp_username',
  key: 'smtp_password',
  key: 'smtp_from_email'
}
```

### Email Use Cases

1. **Campaign Opening**
   - Template: Campaign is now open for orders
   - Recipients: All users of that tenant
   - Triggered by: Platform admin opens campaign

2. **Campaign Closing Reminder**
   - Template: Campaign closes in X days
   - Recipients: Users with incomplete orders
   - Triggered by: Automated (24 hours before close)

3. **Campaign Closed**
   - Template: Campaign is closed, here's your summary
   - Recipients: All users of that tenant
   - Triggered by: Platform admin closes campaign

4. **Admin Notifications**
   - Template: New order placed, waiting for payment
   - Recipients: Tenant admin email
   - Triggered by: User places order

5. **Payment Confirmation**
   - Template: Your order has been confirmed
   - Recipients: Order user email
   - Triggered by: Tenant admin marks order paid

### API Endpoints

**Send Email (Platform Admin Only)**
```
POST /api/platform-admin/email/send

{
  "tenant_id": "tenant_123",
  "recipient_email": "user@example.com",
  "template": "campaign_opening",
  "template_vars": {
    "campaign_name": "Spring 2024",
    "closes_at": "2024-03-31"
  }
}
```

**SMTP Settings**
```
GET /api/platform-admin/settings/smtp
POST /api/platform-admin/settings/smtp
```

## Deployment Guide

### Prerequisites

- Ubuntu 22.04+ VPS
- Domain with wildcard DNS (*.cmssportswear.us)
- NodeJS 18+
- PostgreSQL or SQLite

### Step-by-Step Deployment

#### 1. Setup Domain & DNS

**At GoDaddy**:
1. Add A record: `cmssportswear.us` → `74.208.132.71`
2. Add CNAME record: `*.cmssportswear.us` → `cmssportswear.us`

**Wait for DNS propagation** (5-15 minutes)

Verify:
```bash
nslookup thinkmtb.cmssportswear.us
nslookup admin.cmssportswear.us
# Should both return: 74.208.132.71
```

#### 2. Clone Repository

```bash
cd /opt
git clone https://github.com/yourusername/thinkmtb-order.git
cd thinkmtb-order
```

#### 3. Configure Environment

Create `.env.local`:
```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://cmssportswear.us

# Database
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/cmssportswear

# Platform Admin
PLATFORM_ADMIN_EMAIL=admin@cmssportswear.us
PLATFORM_ADMIN_PASSWORD=YourSecurePassword123!

# SMTP (for global email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@cmssportswear.us

# Session
SESSION_TIMEOUT_MINUTES=15
```

#### 4. Deploy Using Script

```bash
chmod +x scripts/deploy-postgresql.sh
./scripts/deploy-postgresql.sh \
  --domain cmssportswear.us \
  --db-password "your-secure-db-password"
```

Script will:
- Install Node.js, PostgreSQL, Nginx
- Create database and user
- Clone and build application
- Configure PM2 for auto-restart
- Setup SSL with Let's Encrypt
- Configure Nginx for subdomains

#### 5. Initialize Tenants

SSH into VPS:
```bash
cd /opt/thinkmtb-order

# Create first tenant
npm run create-tenant -- \
  --name "ThinkMTB" \
  --slug "thinkmtb" \
  --admin-email "admin@thinkmtb.com" \
  --admin-password "SecurePassword123!"
```

#### 6. Verify Setup

**Test subdomain routing:**
```bash
curl -H "Host: thinkmtb.cmssportswear.us" http://localhost:3000
curl -H "Host: admin.cmssportswear.us" http://localhost:3000/platform-admin/login
```

**Via browser:**
- https://thinkmtb.cmssportswear.us → User portal
- https://admin.cmssportswear.us/platform-admin → Global admin
- https://cmssportswear.us → Main site

### Using Automated Deploy Script

The `scripts/deploy-postgresql.sh` handles everything:

```bash
# Full deployment with SSL
./scripts/deploy-postgresql.sh \
  --domain yourdomain.com \
  --db-password secure123 \
  --admin-email admin@yourdomain.com \
  --admin-password adminpass123

# Output: Credentials, URLs, and next steps
```

## DNS Configuration

### GoDaddy Setup

1. **Login to GoDaddy** → DNS Management

2. **Add A Record**
   ```
   Type: A
   Name: cmssportswear.us
   Value: 74.208.132.71
   TTL: 1 hour
   ```

3. **Add Wildcard CNAME**
   ```
   Type: CNAME
   Name: *.cmssportswear.us
   Value: cmssportswear.us
   TTL: 1 hour
   ```

4. **Verify (takes 5-15 minutes)**
   ```bash
   # Test A record
   nslookup cmssportswear.us
   # Expected: 74.208.132.71
   
   # Test subdomain
   nslookup thinkmtb.cmssportswear.us
   # Expected: 74.208.132.71
   
   # Test admin subdomain
   nslookup admin.cmssportswear.us
   # Expected: 74.208.132.71
   ```

### SSL/TLS Certificates

Deployment script automatically:
- Installs Certbot
- Generates certificates for base domain and wildcard
- Configures auto-renewal

Manual renewal:
```bash
sudo certbot renew --dry-run  # Test
sudo certbot renew             # Actually renew
```

## Environment Variables

Complete `.env.local` template:

```bash
# ═════════════════════════════════════════════════════════════════════════
# APPLICATION SETTINGS
# ═════════════════════════════════════════════════════════════════════════

NODE_ENV=production
PORT=3000
APP_URL=https://cmssportswear.us

# ═════════════════════════════════════════════════════════════════════════
# DATABASE
# ═════════════════════════════════════════════════════════════════════════

# SQLite (simple, single-server)
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite://./data/orders.db

# PostgreSQL (recommended for production, scalable)
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://thinkmtb:password@localhost:5432/cmssportswear_db

# ═════════════════════════════════════════════════════════════════════════
# PLATFORM ADMINISTRATION
# ═════════════════════════════════════════════════════════════════════════

# Platform admin login (super admin)
PLATFORM_ADMIN_EMAIL=admin@cmssportswear.us
PLATFORM_ADMIN_PASSWORD=YourVerySecurePassword123!

# ═════════════════════════════════════════════════════════════════════════
# EMAIL / SMTP (GLOBAL - Platform admin sends all emails)
# ═════════════════════════════════════════════════════════════════════════

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=noreply@cmssportswear.us
SMTP_FROM_NAME=CMS Sports Wear

# ═════════════════════════════════════════════════════════════════════════
# SESSION & SECURITY
# ═════════════════════════════════════════════════════════════════════════

SESSION_TIMEOUT_MINUTES=15
ARCHIVE_RETENTION_DAYS=365

# ═════════════════════════════════════════════════════════════════════════
# OPTIONAL: External Services
# ═════════════════════════════════════════════════════════════════════════

# Backup storage (Phase 2)
BACKUP_STORAGE_TYPE=s3  # or gcs, azure
BACKUP_S3_BUCKET=cmssportswear-backups
BACKUP_S3_REGION=us-east-1

# Analytics (Phase 3)
ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Example Production `.env.local`

```bash
# Production settings
NODE_ENV=production
PORT=3000
APP_URL=https://cmssportswear.us

# PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://thinkmtb:Secure123!@localhost:5432/cmssportswear_prod

# Platform Admin
PLATFORM_ADMIN_EMAIL=admin@cmssportswear.us
PLATFORM_ADMIN_PASSWORD=PlatformAdmin123!Secure456!

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=noreply@cmssportswear.us
SMTP_PASSWORD=app-specific-password-16chars
SMTP_FROM_EMAIL=noreply@cmssportswear.us
SMTP_FROM_NAME=CMS Sports Order System

# Sessions
SESSION_TIMEOUT_MINUTES=15
ARCHIVE_RETENTION_DAYS=365
```

## Troubleshooting

### Subdomain Not Resolving

**Problem**: thinkmtb.cmssportswear.us returns 404

**Solution**:
1. Wait for DNS propagation (15 mins)
2. Verify DNS records at GoDaddy
3. Test locally: `curl -H "Host: thinkmtb.cmssportswear.us" http://localhost:3000`
4. Check middleware in `src/middleware.ts`

### User Login Failing

**Problem**: "Invalid email, password, or team password"

**Solution**:
1. Verify user exists: `SELECT * FROM user_accounts WHERE email = ?;`
2. Verify team password setting: `SELECT * FROM tenant_settings WHERE key = 'team_password';`
3. Check password is correct (case-sensitive)

### Email Not Sending

**Problem**: Platform admin can't send emails

**Solution**:
1. Verify SMTP settings in `.env.local`
2. Test SMTP connection:
   ```bash
   npm run test-smtp
   ```
3. Check logs for specific error

### SSL Certificate Issues

**Problem**: HTTPS shows certificate error

**Solution**:
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate validity
sudo certbot certificates

# Restart Nginx
sudo systemctl restart nginx
```

## Next Steps

1. **Deploy to VPS** using the deployment script
2. **Test subdomain routing** with multiple tenants
3. **Phase 2**: Tenant admin dashboard (`/tenant/[slug]/admin`)
4. **Phase 3**: Background email queue for notifications
5. **Phase 4**: Analytics and reporting dashboard

---

**Last Updated**: 2024-01-15
**Version**: 2.0 (SaaS Platform - User Accounts & Global Admin)
