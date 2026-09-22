# ThinkMTB Order System - Testing Guide

**Deployment Date:** September 22, 2026  
**Latest Commit:** `98ccb52` (Async params fix)  
**Server:** Production (74.208.132.71)  
**Status:** ✅ Live

---

## 🎯 Quick Access URLs

### Admin Portal (Subdomain-based)
```
https://cmsadmin.cmssportswear.us/admin
```
- **Email:** `admin@regusa.com`
- **Password:** `Password123!` ⚠️ (DO NOT CHANGE)

### Team Portal - Two Access Methods

#### Method 1: Subdomain-based (Traditional)
```
https://thinkmtb.cmssportswear.us
Team Password: thinkmtb2024
```

#### Method 2: Path-based (NEW - No DNS required)
```
https://cmssportswear.us/custom/thinkmtb/login
Team Password: thinkmtb2024
```

---

## 🧪 Testing Scenarios

### Test 1: Home Page Redirect Logic
**Purpose:** Verify subdomain detection and routing

```bash
# Visit the home page
https://thinkmtb.cmssportswear.us

# Expected behavior:
# - Page should detect subdomain (thinkmtb)
# - Automatically redirect to team login page
# - Show "Team Portal" heading
```

---

### Test 2: Subdomain-Based Team Portal Login
**Purpose:** Test traditional subdomain routing

```bash
# Step 1: Visit team portal
https://thinkmtb.cmssportswear.us/

# Step 2: On login page, enter:
Email: (any valid email, e.g., test@example.com)
Password: (any password, e.g., Test123!)
Team Password: thinkmtb2024

# Expected behavior:
# - Team password field should be visible
# - After correct team password, user proceeds to registration or login
# - Session cookie set for future visits
```

---

### Test 3: Path-Based Team Portal (NEW)
**Purpose:** Test new path-based routing (no DNS required)

```bash
# Step 1: Visit path-based URL
https://cmssportswear.us/custom/thinkmtb/login

# Step 2: Same login flow as Test 2
Email: test@example.com
Password: Test123!
Team Password: thinkmtb2024

# Expected behavior:
# - Same login form and workflow
# - Works without needing subdomain DNS records
# - Useful for internal/testing URLs
```

---

### Test 4: Admin Dashboard
**Purpose:** Test admin access

```bash
# Step 1: Visit admin portal
https://cmsadmin.cmssportswear.us/admin

# Step 2: Login with:
Email: admin@regusa.com
Password: Password123!

# Expected behavior:
# - Admin dashboard loads
# - Can manage team portals and subdomains
# - Access to system settings
```

---

### Test 5: API Endpoints

#### Subdomain Resolution API
```bash
# Test endpoint that detects subdomain type
curl -H "host: thinkmtb.cmssortswear.us" \
  https://cmssportswear.us/api/subdomain/resolve

# Expected response:
{
  "type": "team",
  "subdomain": "thinkmtb",
  "requires_password": true,
  "redirect": "/custom/thinkmtb/login"
}
```

#### Catalog API
```bash
# Get product catalog (should work without auth)
curl https://cmssportswear.us/api/catalog

# Expected response:
# JSON array of products
```

#### Admin Subdomain Management API
```bash
# Get all configured subdomains
curl https://cmssportswear.us/api/admin/subdomain-redirects

# Expected response:
{
  "success": true,
  "redirects": [
    {
      "subdomain": "thinkmtb",
      "redirect_url": null,
      "is_team_portal": true,
      "team_password": "thinkmtb2024",
      ...
    }
  ]
}
```

---

## 📊 System Architecture - What's New

### ✨ Path-Based Routing Added
Previous system used **only subdomain-based routing**:
- ❌ Required DNS for each team
- ❌ URLs like: `thinkmtb.cmssportswear.us`

New system supports **both** approaches:
- ✅ Subdomain: `thinkmtb.cmssportswear.us`
- ✅ Path-based: `cmssportswear.us/custom/thinkmtb`

### 🔧 How It Works
1. **Middleware** (`src/middleware.ts`) extracts tenant slug from:
   - `/custom/[slug]` pattern (path-based)
   - `/{slug}` pattern (catch-all)
2. **Sets x-tenant-slug header** for route handlers
3. **Layout** (`src/app/[slug]/layout.tsx`) wraps tenant pages
4. **API** still uses subdomain detection for backward compatibility

---

## 🐛 Common Issues & Fixes

### Issue: "This site can't be reached"
**Cause:** DNS not configured for new subdomains  
**Solution:** Use path-based URL instead: `https://cmssportswear.us/custom/[teamname]`

### Issue: SSL certificate error on subdomain
**Cause:** Subdomain not in SSL certificate  
**Solution:** 
1. Use fallback certificate (already configured for `*.cmssportswear.us`)
2. Or use path-based URL (no additional SSL needed)

### Issue: "Team password incorrect" loop
**Cause:** Team password case-sensitive  
**Solution:** Verify exact password: `thinkmtb2024`

### Issue: Page loads but looks broken
**Cause:** HSTS cache or browser cache  
**Solution:** 
```bash
# Chrome: chrome://net-internals/#hsts
# Delete domain entry and reload
# Or use incognito window
```

---

## 📝 Testing Credentials Reference

| Component | Email | Password | Notes |
|-----------|-------|----------|-------|
| Admin Portal | `admin@regusa.com` | `Password123!` | ⚠️ Final - DO NOT CHANGE |
| Team Portal (thinkmtb) | Any | Any | Team Password: `thinkmtb2024` |
| Database | N/A | N/A | SQLite - file-based (no password) |
| SSH Server | root | N/A | SSH key auth only (no password) |

---

## 🚀 Deployment Commands

### Check Application Status
```bash
ssh cmssportswear "pm2 status"
```

### View Application Logs
```bash
ssh cmssportswear "pm2 logs thinkmtb-order --lines 50"
```

### Restart Application
```bash
ssh cmssportswear "pm2 restart thinkmtb-order"
```

### Deploy Latest Changes
```bash
ssh cmssportswear "cd /opt/thinkmtb-order && \
git pull origin main && \
npm run build && \
pm2 restart thinkmtb-order"
```

---

## ✅ Deployment Verification Checklist

- [x] Code pulled from GitHub
- [x] Build succeeds without errors
- [x] Application starts and listens on port 3000
- [x] Nginx reverse proxy forwards requests
- [x] SSL certificates valid
- [x] Subdomain detection working
- [x] Path-based routing working
- [x] Admin portal accessible
- [x] Team portal accessible
- [x] API endpoints responding

---

## 📞 Support & Troubleshooting

**Server Details:**
- **IP:** 74.208.132.71
- **SSH Alias:** `cmssportswear`
- **App Directory:** `/opt/thinkmtb-order`
- **Database:** `/opt/thinkmtb-order/data/orders.db`

**Quick Debug Commands:**
```bash
# SSH to server
ssh cmssportswear

# Check if app is listening
curl -s http://localhost:3000/

# Check Nginx config
sudo nginx -t

# View server logs
tail -f /var/log/nginx/access.log
```

---

**Last Updated:** September 22, 2026 @ 15:18 UTC  
**Commit Hash:** 98ccb52  
**Status:** 🟢 Deployment Complete
