# Multi-Tenant Subdomain System - Setup & Testing Guide

## Quick Summary

The system now supports three types of subdomains:

1. **Admin Portal**: `cmsadmin.cmssportswear.us`
2. **Team Portals**: `teamname.cmssportswear.us` (with team password)
3. **External Redirects**: `anyname.cmssportswear.us` → external URL

## Testing Results ✅

All endpoints are working and tested:

### 1. Create Team Portal Subdomain
```bash
curl -X POST https://yourteam.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "thinkmtb",
    "redirect_url": "https://thinkmtb.bike",
    "is_team_portal": true,
    "tenant_id": "tenant_default",
    "team_password": "thinkmtb2024"
  }'
```

**Result**: `{"success":true, "message":"Subdomain 'thinkmtb' configured successfully"}`

### 2. Create External Redirect Subdomain
```bash
curl -X POST https://yourteam.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "marketing",
    "redirect_url": "https://marketing.example.com",
    "is_team_portal": false
  }'
```

**Result**: `{"success":true, "message":"Subdomain 'marketing' configured successfully"}`

### 3. List All Subdomains
```bash
curl https://yourteam.cmssportswear.us/api/admin/subdomain-redirects
```

**Result**: 
```json
{
  "success": true,
  "redirects": [
    {
      "subdomain": "thinkmtb",
      "is_team_portal": 1,
      "redirect_url": "https://thinkmtb.bike",
      "team_password": "thinkmtb2024"
    },
    {
      "subdomain": "marketing",
      "is_team_portal": 0,
      "redirect_url": "https://marketing.example.com"
    }
  ]
}
```

### 4. Resolve Subdomain (Auto-detection)
```bash
curl https://yourteam.cmssportswear.us/api/subdomain/resolve \
  -H "host: thinkmtb.cmssportswear.us"
```

**Result**:
```json
{
  "type": "team",
  "subdomain": "thinkmtb",
  "tenant_id": "tenant_default",
  "requires_password": true,
  "redirect": "/tenant/thinkmtb/login"
}
```

## How It Works

### Admin Access
When someone visits `cmsadmin.cmssportswear.us`:
1. Root page detects subdomain = "cmsadmin"
2. Redirects to `/admin` (admin dashboard)

### Team Portal Access
When someone visits `thinkmtb.cmssportswear.us`:
1. Root page detects subdomain = "thinkmtb"
2. Checks if configured in database
3. Finds it's a team portal
4. Redirects to `/tenant/thinkmtb/login`
5. User enters team password
6. User creates email/password account
7. User can place orders

### External Redirect
When someone visits `marketing.cmssportswear.us`:
1. Root page detects subdomain = "marketing"
2. Checks if configured in database
3. Finds it's an external redirect
4. Performs HTTP redirect to `https://marketing.example.com`

## Features Implemented

### Database
✅ New `subdomain_redirects` table
✅ Subdomain configuration storage
✅ Team password support
✅ Tenant linking for team portals

### API Endpoints
✅ `/api/admin/subdomain-redirects` (GET/POST/DELETE)
- GET: List all subdomains
- POST: Create/update subdomain
- DELETE: Remove subdomain

✅ `/api/subdomain/resolve` (GET)
- Auto-detect subdomain from Host header
- Return routing information

### Front-End
✅ Updated `src/app/page.tsx`
- Detects subdomain on page load
- Routes to appropriate location
- Falls back to default homepage

### Nginx
✅ Wildcard subdomain support
✅ All `*.cmssportswear.us` routed to app
✅ Original hostname preserved in `Host` header

## Database Schema

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

## Validation Rules

- **Subdomain format**: Lowercase letters, numbers, hyphens only
- **Reserved subdomains**: www, mail, ftp, ns, admin, cmsadmin
- **Team portal validation**: Must have tenant_id
- **External redirect validation**: Must have valid redirect_url

## Next Steps

1. **Add authentication** to `/api/admin/subdomain-redirects` endpoint
2. **Test team portal flow**: password → create account → order
3. **Set up team portals** for your existing teams
4. **Configure external redirects** as needed
5. **Monitor subdomain usage** and analytics

## Commands for Quick Setup

### Create a team portal
```bash
curl -X POST https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "TEAMNAME",
    "is_team_portal": true,
    "tenant_id": "tenant_default",
    "team_password": "TEAMPASSWORD",
    "redirect_url": "https://TEAMNAME.cmssportswear.us"
  }'
```

### Create an external redirect
```bash
curl -X POST https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "SUBDOMAIN",
    "redirect_url": "https://external-url.com",
    "is_team_portal": false
  }'
```

### Delete a subdomain
```bash
curl -X DELETE https://cmsadmin.cmssportswear.us/api/admin/subdomain-redirects \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "SUBDOMAIN"}'
```

## Production Considerations

- [ ] Add rate limiting to subdomain APIs
- [ ] Require admin authentication for subdomain management
- [ ] Add audit logging for subdomain changes
- [ ] Implement subdomain usage quotas
- [ ] Add email verification for team portals
- [ ] Monitor HTTPS certificate expiration
- [ ] Set up alerts for subdomain creation/deletion
