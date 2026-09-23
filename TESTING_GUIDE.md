# ThinkMTB Order System - Testing Guide

**Deployment Date:** September 23, 2026  
**Latest Update:** Single SSL Certificate Configuration  
**Server:** Production (74.208.132.71)  
**Status:** ✅ Live

---

## 🎯 Quick Access URLs

### ✅ SINGLE DOMAIN - All services use custom.cmssportswear.us

#### Admin Management Portal
```
https://custom.cmssportswear.us/cmsadmin
```
- **Email:** `admin@regusa.com`
- **Password:** `Password123!` ⚠️ (DO NOT CHANGE)
- **API Access:** `https://custom.cmssportswear.us/cmsadmin/api/*`

#### Customer Landing Portal
```
https://custom.cmssportswear.us/
```
- Join form to enter team portals
- Features overview

#### Team Portal Access
```
https://custom.cmssportswear.us/custom/[teamname]/unlock
```
- **Example:** `https://custom.cmssportswear.us/custom/thinkmtb/unlock`
- **Team Password:** `thinkmtb2024`

#### Team Login (After Password Verification)
```
https://custom.cmssportswear.us/custom/[teamname]/login
```
- **Example:** `https://custom.cmssportswear.us/custom/thinkmtb/login`
- User login after team password is verified

#### Password Reset
```
https://custom.cmssportswear.us/custom/[teamname]/forgot-password
```

---

## 🧪 Testing Scenarios

### Test 1: Landing Page
**Purpose:** Verify customer portal is accessible

```bash
# Visit the landing page
https://custom.cmssportswear.us/

# Expected behavior:
# - Welcome message for CMS Sports Wear Custom Designs
# - Feature highlights displayed
# - Team name input form visible
```

---

### Test 2: Team Portal Access
**Purpose:** Test team password gate

```bash
# Step 1: From landing page, enter team name
https://custom.cmssportswear.us/
Team: thinkmtb
Click "Enter Portal"

# Step 2: On unlock page, enter team password
https://custom.cmssportswear.us/custom/thinkmtb/unlock
Team Password: thinkmtb2024

# Expected behavior:
# - Form accepts password
# - Redirects to login page on success
# - Session cookie set
```

---

### Test 3: Team Login
**Purpose:** Test user authentication after team gate

```bash
# Step 1: Direct access to login (after password verified)
https://custom.cmssportswear.us/custom/thinkmtb/login

# Step 2: Enter credentials
Email: demo@cmssportswear.us
Password: Demo123!

# Expected behavior:
# - Login form displays
# - Redirects to dashboard on success
# - "Create New Account" link available
# - "Forgot password" link available
```

---

### Test 4: Admin Dashboard
**Purpose:** Test admin access via single domain

```bash
# Step 1: Visit admin at unified path
https://custom.cmssportswear.us/cmsadmin

# Step 2: Login with admin credentials
Email: admin@regusa.com
Password: Password123!

# Expected behavior:
# - Admin dashboard loads
# - Can manage products, designs, orders
# - Access to pricing tiers
# - Payment management
```

---

### Test 5: Admin API Endpoints

#### Get Admin Summary
```bash
curl https://custom.cmssportswear.us/cmsadmin/api/summary

# Expected response:
{
  "summary": {
    "totalOrders": 0,
    "totalItems": 0,
    "byProduct": [...],
    "byDesign": [...],
    "bySize": [...]
  }
}
```

#### Get Subdomain Redirects
```bash
curl https://custom.cmssportswear.us/cmsadmin/api/subdomain-redirects

# Expected response:
{
  "success": true,
  "redirects": [...]
}
```

---

## 📊 System Architecture - Unified Domain Structure

### ✨ Single Certificate Consolidation
**Previous system:**
- ❌ Multiple subdomains: thinkmtb.cmssportswear.us, cmsadmin.cmssportswear.us, custom.cmssportswear.us
- ❌ Multiple SSL certificates required
- ❌ Complex DNS management

**New system:**
- ✅ Single domain: custom.cmssportswear.us
- ✅ One SSL certificate (expires 2026-12-22)
- ✅ Path-based routing for all services:
  - `/` - Customer landing
  - `/custom/[teamname]/*` - Team portals
  - `/cmsadmin/*` - Admin management

### 🔧 Routing Structure
```
custom.cmssportswear.us/
├── /                          → Customer landing page
├── /custom/[teamname]/
│   ├── /unlock                → Team password gate
│   ├── /login                 → Team user login
│   ├── /register              → User registration
│   ├── /forgot-password       → Password reset request
│   └── /reset-password        → Complete password reset
├── /cmsadmin/                 → Admin dashboard
├── /cmsadmin/api/*            → Admin APIs
└── /api/                      → Public APIs (catalog, etc.)
```

### 🔐 Security Features
- Single SSL certificate for entire domain
- Team password protection for portals
- Admin login gate
- Session-based access control
- Path-based routing eliminates DNS/cert complexity

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot find team" when accessing team portal
**Cause:** Team password gate not verifying correctly  
**Solution:** 
1. Verify team exists in database
2. Check team password is exact match (case-sensitive)
3. Ensure cookie is set after password verification

### Issue: Admin area not loading
**Cause:** Not authenticated as admin  
**Solution:** 
1. Navigate to `https://custom.cmssportswear.us/cmsadmin`
2. Login with `admin@regusa.com` / `Password123!`
3. Check password hasn't been changed

### Issue: SSL certificate warnings
**Cause:** Browser cache or incomplete redirect  
**Solution:** 
1. Use https:// explicitly
2. Clear browser cache
3. Try incognito/private window
4. Certificate covers *.cmssportswear.us and custom.cmssportswear.us

---

## 📝 Testing Credentials Reference

| Component | Email | Password | Notes |
|-----------|-------|----------|-------|
| Admin Portal | `admin@regusa.com` | `Password123!` | ⚠️ Final - DO NOT CHANGE |
| Team Portal (thinkmtb) | - | `thinkmtb2024` | Team password, not user password |
| Demo User | `demo@cmssportswear.us` | `Demo123!` | Test user in thinkmtb team |
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

### Check Nginx for Domain
```bash
ssh cmssportswear "sudo cat /etc/nginx/sites-available/custom.cmssportswear.us | head -20"
```

---

## ✅ Deployment Verification Checklist

- [x] Single domain routing configured
- [x] SSL certificate for custom.cmssportswear.us installed
- [x] Path-based routing working (no subdomains required)
- [x] Admin portal at /cmsadmin
- [x] Admin API at /cmsadmin/api
- [x] Customer landing at /
- [x] Team portals at /custom/[teamname]/*
- [x] Nginx reverse proxy configured
- [x] Application builds successfully
- [x] All routes tested

---

## 📞 Support & Troubleshooting

**Server Details:**
- **IP:** 74.208.132.71
- **SSH Alias:** `cmssportswear`
- **App Directory:** `/opt/thinkmtb-order`
- **Database:** `/opt/thinkmtb-order/data/orders.db`
- **Domain:** custom.cmssportswear.us

**Quick Debug Commands:**
```bash
# SSH to server
ssh cmssportswear

# Check if app is listening
curl -s http://localhost:3000/

# Check Nginx config
sudo nginx -t

# View application logs
pm2 logs thinkmtb-order

# View Nginx access logs
tail -f /var/log/nginx/custom-cmssportswear-access.log
```

---

**Last Updated:** September 23, 2026  
**Status:** 🟢 Unified Domain Configuration Complete

