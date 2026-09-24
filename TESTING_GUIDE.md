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

### Test 6: Phase 1 - Design Request Submission
**Purpose:** Test complete design request workflow

```bash
# Step 1: Login as team user
https://custom.cmssportswear.us/custom/thinkmtb/login
Email: demo@cmssportswear.us
Password: Demo123!

# Step 2: Navigate to design request step
https://custom.cmssportswear.us/custom/thinkmtb/order/design

# Step 3: Submit design request
- Title: "2026 Team Jerseys"
- Description: "Custom design with team logo and colors"
- Upload files: Select 1-2 image files (PNG/JPG)
- Click "Submit Design Request"

# Expected behavior:
# - Success message displayed
# - Request appears in design requests list
# - Status shows "pending"
# - Files are attached
# - Redirect to request detail view
```

---

### Test 7: Phase 2 - Product Selection
**Purpose:** Test product selection with dynamic pricing

```bash
# Prerequisites: Complete Test 6 first, design must be approved

# Step 1: After design is approved, navigate to products
https://custom.cmssportswear.us/custom/thinkmtb/order/products

# Step 2: Select products
- Choose 1+ products from list (e.g., "Jersey", "Shorts")
- Enter quantity for each product
- Watch prices update in real-time based on quantity
- Verify pricing tiers display correctly

# Step 3: Review order summary
- Check subtotal calculation
- Verify USD and CRC amounts
- Review exchange rate (typically 500 CRC/USD)
- Optional: Add notes to order

# Step 4: Submit order
- Click "Create Order"

# Expected behavior:
# - Success message: "Order created successfully"
# - Order status set to 'draft_products_selected'
# - Automatic redirect to payment page
# - Order ID generated
```

---

### Test 8: Phase 3 - Payment & Order Review
**Purpose:** Test payment request workflow

```bash
# Prerequisites: Complete Test 7 first

# Step 1: On payment review page (automatic redirect from Test 7)
https://custom.cmssportswear.us/custom/thinkmtb/order/payment/[ORDER_ID]

# Step 2: Review order details
- Verify order number displays
- Check all selected items in table
- Confirm quantities and prices
- Verify subtotal = sum of items

# Step 3: Review payment information
- 50% Deposit Due: Shows USD and CRC amounts
- Final Payment: Shows remaining 50%
- Timeline shows 5-step process

# Step 4: Request payment link
- Click "Request Payment Link" button
- Confirm in dialog
- Success message: "Payment request created!"

# Expected behavior:
# - Payment record created with status='requested'
# - Order status changes to 'payment_requested'
# - UI shows payment status pending
# - Admin receives notification (next phase)
# - Page displays FAQ and support info
```

---

### Test 9: End-to-End Workflow (All 3 Phases)
**Purpose:** Test complete customer journey from design to payment

```bash
# Complete flow:
# 1. Login → Test 6 (Design) → Design gets approved (admin action)
# 2. Navigate to products → Test 7 (Products) → Create order
# 3. Auto-redirect → Test 8 (Payment) → Request payment

# API Endpoints tested:
POST /api/designs/requests                    # Submit design
GET  /api/designs/requests                    # List designs
GET  /api/designs/requests/[id]               # Get design details
POST /api/designs/requests/[id]/files         # Upload files
POST /api/designs/requests/[id]/submissions   # Submit to designers
PATCH /api/designs/requests/[id]/submissions/[subId]  # Approve submission

GET  /api/team/products                       # List products
POST /api/team/products/calculate-price       # Calculate pricing
POST /api/orders/create-with-products         # Create order

GET  /api/orders/[id]/payment                 # Get order & payment info
POST /api/orders/[id]/payment                 # Request payment link

# Database tables used:
# - design_requests
# - design_request_files
# - design_submissions
# - design_submission_files
# - design_comments
# - team_products
# - orders
# - order_items
# - order_payments
# - pricing_tiers
# - price_overrides
```

---

## �️ Database Configuration

### Current Setup
- **Type:** SQLite with better-sqlite3
- **Location:** `/opt/thinkmtb-order/data/orders.db`
- **Mode:** WAL (Write-Ahead Logging)
- **Constraints:** Foreign keys enabled

### Migration to PostgreSQL (Optional)
If migrating to PostgreSQL for better concurrent access:

```bash
# On server, install PostgreSQL
ssh cmssportswear "sudo apt-get install postgresql postgresql-contrib"

# Create database and user
ssh cmssportswear "sudo -u postgres psql << EOF
CREATE DATABASE thinkmtb_order;
CREATE USER thinkmtb WITH PASSWORD '[SECURE_PASSWORD]';
ALTER ROLE thinkmtb SET client_encoding TO 'utf8';
ALTER ROLE thinkmtb SET default_transaction_isolation TO 'read committed';
ALTER ROLE thinkmtb SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE thinkmtb_order TO thinkmtb;
EOF"

# Update .env to use PostgreSQL:
# DATABASE_URL=postgresql://thinkmtb:[PASSWORD]@localhost:5432/thinkmtb_order

# Migrate SQLite data to PostgreSQL (requires custom migration script)
# Then deploy and restart application
```

---

## �📊 System Architecture - Unified Domain Structure

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

## 📋 Test Execution Checklist

### Pre-Testing Setup
- [ ] Application deployed to production (PM2 running)
- [ ] Database initialized with schema migrations
- [ ] Admin credentials verified (admin@regusa.com / Password123!)
- [ ] Demo user exists (demo@cmssportswear.us / Demo123!)
- [ ] Team password set (thinkmtb2024)
- [ ] Design files available for upload (JPG/PNG images)

### Test Execution Order
1. [ ] Test 1: Landing Page
2. [ ] Test 2: Team Portal Access
3. [ ] Test 3: Team Login
4. [ ] Test 4: Admin Dashboard
5. [ ] Test 5: Admin API Endpoints
6. [ ] Test 6: Phase 1 - Design Request
7. [ ] Test 7: Phase 2 - Product Selection
8. [ ] Test 8: Phase 3 - Payment Review
9. [ ] Test 9: End-to-End Workflow

### Post-Testing Verification
- [ ] All API endpoints returning expected responses
- [ ] Database records created successfully
- [ ] No TypeScript/JavaScript errors in console
- [ ] No 500 errors in PM2 logs
- [ ] Page redirects working correctly
- [ ] Session cookies persisting across requests
- [ ] Payment request status changes correctly

---

**Last Updated:** September 23, 2026  
**Status:** 🟢 Phase 1-3 Testing Guide Complete
**Database:** SQLite (4.4 compatible)

