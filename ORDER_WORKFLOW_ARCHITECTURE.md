# Order Workflow Architecture - Complete Implementation Guide

## Overview
Complete end-to-end order management system with:
- Design request workflow (team captains → designers → approval)
- Product/pricing management with CMS overrides
- Two-stage payment system (50% deposit + final)
- Designer portal with limited permissions
- Customer wizard for intuitive ordering

---

## 1. CUSTOMER PORTAL - Step-by-Step Wizard

### Step 1: Design Request (custom.cmssportswear.us/custom/[teamname]/order/design)
**Purpose:** Team captains request custom designs

**UI Components:**
- Design request form (title, description, notes)
- File upload for logo/design ideas (multiple files)
- Comment section for requirements
- Submit button

**Actions:**
- Create `design_requests` record
- Upload files to `design_request_files`
- Route request to admin + designer queue
- Set status to "pending"

**Data:**
```typescript
interface DesignRequest {
  id: string;
  title: string;
  description: string;
  files: DesignFile[];
  comments: Comment[];
  status: 'pending' | 'in_design' | 'approved' | 'rejected';
  requesterId: string;
  teamId: string;
  approvedSubmissionId?: string;
}
```

### Step 2: Product Selection (custom.cmssportswear.us/custom/[teamname]/order/products)
**Purpose:** Select products and quantities after design is approved

**UI Components:**
- Available products list (fetched from `team_products`)
- Quantity input with price scaling
- Dynamic pricing display (respects price overrides)
- Cart summary with total

**Actions:**
- Fetch available products for team
- Calculate pricing based on quantity tiers
- Apply any active price overrides
- Store selections in order items

**Data Flow:**
1. Get team ID from session
2. Query `team_products` for available products
3. For each product, get pricing from `pricing_tiers` or `price_overrides`
4. Add to temp cart (session)

### Step 3: Payment Request (custom.cmssportswear.us/custom/[teamname]/order/payment)
**Purpose:** Initiate payment process and provide payment link

**UI Components:**
- Order summary (products, quantities, pricing)
- Deposit amount display (50% of total)
- Shipping method selector
- Final total with shipping
- Payment request button
- Status tracking

**Actions:**
1. Create `order_payments` record with stage="deposit_50"
2. Set status to "requested"
3. Admin receives notification to generate payment link
4. Admin generates BAC link and posts it
5. User receives link and can mark as "paid"

**Data:**
```typescript
interface OrderPayment {
  id: string;
  orderId: string;
  paymentStage: 'deposit_50' | 'final_50' | 'shipping_adjustment';
  amountUSD: number;
  amountCRC: number;
  status: 'pending' | 'requested' | 'paid' | 'confirmed';
  bacPaymentLink?: string;
  paymentReference?: string;
}
```

### Step 4: Order Status (custom.cmssportswear.us/custom/[teamname]/order/status/[orderId])
**Purpose:** Track order progress through workflow

**UI Elements:**
- Timeline showing: Design Approved → Payment Requested → 50% Paid → Order Shipped → 100% Requested → Shipped
- Current step highlighted
- Payment status with BAC link (if available)
- Notifications from admins

---

## 2. DESIGNER PORTAL

### Design Queue Page (custom.cmssportswear.us/designers)
**Route:** Separate designer login, limited permissions
**Access:** Special `designer_accounts` with role='designer'

**Sections:**
1. **Pending Requests** - Design requests awaiting submission
2. **Submissions** - Designs they've submitted and status
3. **Feedback** - Comments/revisions requested

### Design Submission Page (custom.cmssportswear.us/designers/request/[id]/submit)
**Purpose:** Designers submit proposed designs

**UI:**
- View original request and attached files
- Comment thread with requester
- Design file upload area (multiple files)
- Submit button
- Version tracking (submission #1, #2, etc.)

**Process:**
1. Fetch `design_requests` with ID
2. Load `design_request_files` (original upload)
3. Load `design_comments` thread
4. Allow file upload
5. Create `design_submissions` record
6. Upload files to `design_submission_files`
7. Notify requester

---

## 3. ADMIN DASHBOARD ENHANCEMENTS

### Team Captains Management (custom.cmssportswear.us/cmsadmin/team-captains)
**Purpose:** Designate which users can request designs

**UI:**
- List of team users
- Toggle "Team Captain" role
- Bulk actions

**API:** POST `/api/cmsadmin/team-captains/set-role`

### Products Management (custom.cmssportswear.us/cmsadmin/products)
**Purpose:** Manage which products available for teams

**Sections:**
1. **Global Products** - All available products
2. **Team Products** - Assign/remove products per team
3. **Pricing Tiers** - Base pricing by quantity
4. **Price Overrides** - Special pricing (requires approval)

**Features:**
- Add/remove products from teams
- Set pricing scales (qty 1-5, 6-10, etc.)
- Approve special pricing requests
- Set expiration dates on overrides

### Design Request Queue (custom.cmssportswear.us/cmsadmin/designs)
**Purpose:** Monitor design workflow

**Views:**
- Pending requests (awaiting submission)
- Pending approval (awaiting customer decision)
- Approved designs
- Archive

**Actions:**
- View request details
- See submissions from designers
- Send approval/rejection to customer
- Add notes/comments

### Payment Links (custom.cmssportswear.us/cmsadmin/payments)
**Purpose:** Generate and send BAC payment links

**Process:**
1. Filter payment requests by status="requested"
2. Display order summary with amount in CRC/USD
3. Manual BAC link creation (copy/paste from BAC admin)
4. Paste link and save
5. System sends link to customer

**Features:**
- Payment reference tracking
- Mark as confirmed when payment received
- Approve transition to next stage (shipping → final payment)

### Order Management (custom.cmssportswear.us/cmsadmin/orders)
**Purpose:** Full order lifecycle management

**Workflow:**
1. Design Approved → Order Created
2. Customer selects products
3. Admin requests payment (50% deposit)
4. Payment received → Order confirmed
5. Order shipped to customer
6. Request final shipping info
7. Calculate final total (50% remaining + shipping)
8. Send final payment link
9. Final payment received → Order complete

---

## 4. DATABASE SCHEMA

### User Tables
- `user_accounts` - Added `is_team_captain`, `user_role`
- `designer_accounts` - Special accounts for designers (limited permissions)

### Design Tables
- `design_requests` - Team captain requests
- `design_request_files` - Original files/logos uploaded
- `design_submissions` - Designer responses
- `design_submission_files` - Designer's proposed designs
- `design_comments` - Feedback thread

### Product Tables
- `team_products` - Products available per team
- `price_overrides` - Special pricing (CMS approved)

### Order Tables
- `orders` - Main order record (with approved_design_id)
- `order_items` - Products, quantities, pricing
- `order_payments` - Payment tracking (50% + 100%)
- `order_shipping` - Shipping method selection
- `payment_notifications` - Admin notifications to customers

### Settings Tables
- `shipping_options` - Available shipping methods
- `designers` - Designer account management

---

## 5. API ENDPOINTS

### Design Workflow
- POST `/api/designs/request` - Create request
- POST `/api/designs/request/[id]/upload` - Upload files
- GET `/api/designs/requests` - List requests
- GET `/api/designs/requests/[id]` - Get details
- POST `/api/designs/submission/[id]/submit` - Submit design
- POST `/api/designs/submission/[id]/approve` - Approve
- POST `/api/designs/submission/[id]/reject` - Reject
- POST `/api/designs/request/[id]/comment` - Add comment

### Product Workflow
- GET `/api/team/products/available` - Available for team
- POST `/api/cmsadmin/team-products` - Assign product
- DELETE `/api/cmsadmin/team-products/[id]` - Remove product
- POST `/api/cmsadmin/pricing/override` - Special pricing
- GET `/api/cmsadmin/pricing/overrides` - List overrides

### Order Workflow
- POST `/api/orders/create` - Create order
- POST `/api/orders/[id]/complete-design` - Mark design approved
- POST `/api/orders/[id]/add-items` - Add products
- POST `/api/orders/[id]/select-shipping` - Choose shipping

### Payment Workflow
- POST `/api/orders/[id]/request-payment` - Request deposit link
- POST `/api/cmsadmin/payments/[id]/generate-link` - Create BAC link
- POST `/api/cmsadmin/payments/[id]/confirm-paid` - Mark paid
- GET `/api/payments/status/[orderId]` - Payment status
- POST `/api/payments/[id]/mark-ready` - Order ready for pickup
- POST `/api/payments/[id]/request-final` - Request final payment

### Designer Portal
- GET `/api/designers/requests` - My pending requests
- GET `/api/designers/submissions` - My submissions
- POST `/api/designers/submit/[id]` - Submit design
- GET `/api/designers/feedback/[id]` - Feedback on submission

### Admin
- POST `/api/cmsadmin/team-captains/set` - Make user team captain
- GET `/api/cmsadmin/team-captains` - List team captains
- GET `/api/cmsadmin/orders/queue` - All pending actions
- GET `/api/cmsadmin/analytics` - Stats and trends

---

## 6. USER ROLES & PERMISSIONS

### Regular User
- Can view their own orders
- Cannot request designs
- Can see order status

### Team Captain (Same Team)
- Can request designs
- Can select products
- Can request payments
- Receive design submissions from designers
- Approve/reject designs

### Designer (Special Account)
- Limited login (custom.cmssportswear.us/designers)
- View design requests
- Submit designs
- See feedback
- Cannot access other admin functions

### CMS Admin (custom.cmssportswear.us/cmsadmin)
- Full access to all orders
- Manage team captains
- Manage products & pricing
- Generate payment links
- View all design requests
- Approve price overrides
- Send notifications

### CMS Management
- Only: Approve special pricing
- Permission: `approve_price_override`

---

## 7. NOTIFICATION FLOW

### Notifications Sent To:
**Customer (Team Captain):**
- Design submission ready for review
- Need to respond to designer feedback
- Payment link available
- Order ready for pickup
- Final payment requested
- Order shipped

**Designer:**
- New design request
- Customer feedback/revision request
- Design approved
- Design rejected

**Admin:**
- New design request submitted
- Designer submitted design
- Customer approved/rejected design
- Payment link needed
- Payment received
- Customer ready to pay final

---

## 8. IMPLEMENTATION PRIORITY

Phase 1 (MVP):
- Design request → submission → approval
- Product selection with pricing
- Payment request (50% deposit only)

Phase 2:
- Price overrides management
- Final payment flow
- Shipping selection

Phase 3:
- Designer portal & notifications
- Full admin analytics
- Advanced reporting

---

This architecture ensures:
✅ Clear separation of concerns
✅ Intuitive customer wizard
✅ Flexible admin control
✅ Designer collaboration
✅ Complete payment tracking
✅ Audit trail of all actions
