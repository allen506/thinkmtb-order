# Multi-Tenant Subdomain Routing System

## Overview

The system supports three types of subdomain configurations:

1. **Admin Portal** - `cmsadmin.cmssportswear.us`
2. **Team Portals** - `teamname.cmssportswear.us` (requires team password, can create account)
3. **External Redirects** - Any other subdomain can redirect to an external URL

## Architecture

### Database Schema

**subdomain_redirects table:**
```sql
CREATE TABLE subdomain_redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain TEXT NOT NULL UNIQUE,
  redirect_url TEXT NOT NULL,
  tenant_id TEXT,
  is_team_portal INTEGER NOT NULL DEFAULT 0,
  team_password TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Components

#### 1. `lib/subdomain.ts` - Utilities
- `extractSubdomain(hostname)` - Extract subdomain from hostname
- `classifySubdomain(subdomain)` - Classify as admin/team/redirect/unknown
- `getSubdomainFromRequest(request)` - Get subdomain from request headers

#### 2. `lib/tenant.ts` - Subdomain Management
Functions for managing subdomain redirects:
- `getSubdomainRedirect(subdomain)` - Get configuration for a subdomain
- `setSubdomainRedirect(...)` - Create or update a subdomain configuration
- `getAllSubdomainRedirects()` - List all configured subdomains
- `deleteSubdomainRedirect(subdomain)` - Remove a subdomain

#### 3. API Endpoints

**`/api/subdomain/resolve`** (GET)
- Detects the subdomain from request headers
- Returns routing information:
  ```json
  {
    "type": "admin|team|redirect|unknown",
    "subdomain": "teamname",
    "redirect": "/admin|/tenant/[subdomain]/login",
    "redirect_url": "https://external.com"
  }
  ```

**`/api/admin/subdomain-redirects`** (GET/POST/DELETE)
- **GET** - List all configured subdomains
- **POST** - Create/update a subdomain redirect
  ```json
  {
    "subdomain": "thinkmtb",
    "redirect_url": "https://example.com",
    "is_team_portal": true,
    "tenant_id": "tenant_123",
    "team_password": "secretpassword"
  }
  ```
- **DELETE** - Remove a subdomain configuration
  ```json
  {
    "subdomain": "thinkmtb"
  }
  ```

### Front-End Routing

**`src/app/page.tsx`** (Root Homepage)
The homepage detects the subdomain and:
1. If `cmsadmin` → Redirects to `/admin`
2. If configured team portal → Redirects to `/tenant/[subdomain]/login`
3. If configured redirect → Performs external redirect
4. Otherwise → Shows default homepage

## Usage Examples

### Setting Up a Team Portal

```bash
curl -X POST https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "thinkmtb",
    "redirect_url": "https://thinkmtb.com",
    "is_team_portal": true,
    "tenant_id": "tenant_123",
    "team_password": "thinkteam2024"
  }'
```

Now `thinkmtb.cmssportswear.us` will:
1. Show team login page
2. Require team password
3. Allow user to create account
4. Enable order placement

### Setting Up an External Redirect

```bash
curl -X POST https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "marketing",
    "redirect_url": "https://marketing.example.com",
    "is_team_portal": false
  }'
```

Now `marketing.cmssportswear.us` will redirect to `https://marketing.example.com`

### Listing All Subdomains

```bash
curl https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects
```

Returns:
```json
{
  "success": true,
  "redirects": [
    {
      "subdomain": "thinkmtb",
      "is_team_portal": 1,
      "redirect_url": "https://thinkmtb.com",
      "tenant_id": "tenant_123"
    },
    {
      "subdomain": "marketing",
      "is_team_portal": 0,
      "redirect_url": "https://marketing.example.com",
      "tenant_id": null
    }
  ]
}
```

### Removing a Subdomain

```bash
curl -X DELETE https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "thinkmtb"}'
```

## Nginx Configuration

Nginx is configured to accept all `*.cmssportswear.us` subdomains and proxy them to the Node.js app:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cmssportswear.us *.cmssportswear.us;
    
    # All subdomains go to the Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;  # Important: preserve original hostname
        # ... other proxy headers
    }
}
```

The app receives the original hostname via the `Host` header and can determine the subdomain.

## Team Portal Flow

1. User visits `teamname.cmssportswear.us`
2. Root page detects subdomain and redirects to `/tenant/teamname/login`
3. Login page shows team password prompt
4. After entering password, user creates account with email/password
5. Session is established
6. User can place orders

## Reserved Subdomains

These subdomains are reserved and cannot be used:
- `www` - Redirects to base domain
- `mail` - Mail server
- `ftp` - FTP server
- `ns` - Nameserver
- `admin` - Reserved for future use
- `cmsadmin` - Admin portal (hardcoded)

## Security Considerations

1. **Team Passwords**: Store team passwords securely (hashed in database)
2. **Email Verification**: Consider requiring email verification for team portals
3. **Rate Limiting**: Add rate limiting to login endpoints to prevent brute force
4. **HTTPS Only**: All subdomains require valid SSL certificate (wildcard or multi-SAN)
5. **HSTS**: Enable Strict-Transport-Security header for all subdomains

## Future Enhancements

- [ ] Admin authentication for subdomain management API
- [ ] Subdomain analytics (tracking which subdomains are accessed)
- [ ] Custom branding per subdomain (logos, colors)
- [ ] Subdomain usage quotas
- [ ] Subdomain activity logging
- [ ] Bulk subdomain import/export
