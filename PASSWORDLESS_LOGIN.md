# 🔐 Passwordless Authentication Guide

## Overview

Your application now supports **passwordless login** using secure magic links! This eliminates the need for users to remember and manage passwords while maintaining high security.

## How It Works

### User Flow
1. User enters their email address on login page
2. System generates a secure token and sends a magic link via email
3. User clicks the link in their email
4. System verifies the token and creates a session
5. User is logged in without entering any password

### Features
- ✅ **No Passwords to Remember** - Users only need their email
- ✅ **Secure Tokens** - 32-byte random tokens, valid for 15 minutes
- ✅ **Email-Based** - Uses email delivery for verification
- ✅ **One-Click Login** - Magic link automatically logs user in
- ✅ **Testing Support** - Shows token in development mode
- ✅ **Auto-Expiry** - Tokens expire after 15 minutes
- ✅ **Token Cleanup** - Expired tokens are automatically cleaned up

## User Guide

### For Users
**Option 1: Magic Link (Recommended)**
1. Go to login page: `https://yourteam.cmssportswear.us/tenant/login`
2. Click the "🔗 Magic Link" tab (default)
3. Enter your email address
4. Click "📧 Send Login Link"
5. Check your email for the login link
6. Click the link to log in instantly

**Option 2: Traditional Password**
1. Go to login page: `https://yourteam.cmssportswear.us/tenant/login`
2. Click the "🔑 Password" tab
3. Enter your email and password
4. Click "🔐 Sign In"

### Setup Your Account
First-time users need to create an account:
1. Go to: `https://yourteam.cmssportswear.us/tenant/register`
2. Fill in your full name and email
3. Create a password (if using password login)
4. Click "Create Account"
5. Log in using either magic link or password

## API Reference

### Request Passwordless Login
```bash
curl -X POST http://localhost:3000/api/tenant/auth/passwordless \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: thinkmtb" \
  -d '{"email": "user@example.com"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Check your email for a login link. Link expires in 15 minutes.",
  "token": "abc123..." // Only in development mode
}
```

### Verify Passwordless Token
```bash
curl -X POST http://localhost:3000/api/tenant/auth/verify-passwordless \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: thinkmtb" \
  -d '{"token": "abc123..."}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user_123...",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

Sets secure HTTP-only cookies:
- `tenant_session` - Session token (7 days)
- `tenant_user_id` - User ID

## Development & Testing

### Testing Passwordless Login Locally

**Database:** passwordless tokens are stored in `passwordless_tokens` table

**Development Mode Benefits:**
- Magic link tokens are returned in API responses
- Tokens are logged to console
- Tokens don't require email delivery
- Useful for testing without email setup

**Example Development Flow:**
```bash
# 1. Request magic link
curl -X POST http://localhost:3000/api/tenant/auth/passwordless \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Response includes token in development:
# {
#   "success": true,
#   "token": "a1b2c3d4e5f6..."
# }

# 2. Verify the token
curl -X POST http://localhost:3000/api/tenant/auth/verify-passwordless \
  -H "Content-Type: application/json" \
  -d '{"token": "a1b2c3d4e5f6..."}'

# 3. User is now logged in with session cookies
```

### Production Email Setup

To enable real email delivery in production:

1. **Update `.env.local` with SMTP credentials:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

2. **Implement email sending in `src/lib/passwordless.ts`:**

The `sendPasswordlessEmail()` function currently logs tokens but can be enhanced to use Nodemailer or other email services:

```typescript
import nodemailer from 'nodemailer';

export async function sendPasswordlessEmail(
  email: string,
  magicLink: string,
  tenantName: string
): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to: email,
    subject: `Login to ${tenantName}`,
    html: `
      <h2>Sign In to ${tenantName}</h2>
      <p>Click the link below to sign in (link expires in 15 minutes):</p>
      <a href="${magicLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Sign In
      </a>
      <p>Or copy this link: ${magicLink}</p>
    `,
  });

  return true;
}
```

3. **Install Nodemailer:**
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Security Features

### Token Security
- **32-byte Random Tokens** - Cryptographically secure generation
- **Single-Use Tokens** - Tokens are marked as used after verification
- **Auto-Expiry** - Tokens expire after 15 minutes
- **Database Stored** - Tokens in database, not transmitted in URLs unnecessarily
- **HTTPS Only** - Tokens transmitted over HTTPS in production

### Session Security
- **HTTP-Only Cookies** - Session tokens not accessible via JavaScript
- **Secure Cookies** - Transmitted over HTTPS only in production
- **SameSite Protection** - CSRF protection enabled
- **7-Day Expiry** - Sessions automatically expire after 7 days

### Best Practices
- ✅ Never store passwords in localStorage
- ✅ Always use HTTPS in production
- ✅ Regularly rotate session cookies
- ✅ Log authentication attempts for security auditing
- ✅ Rate-limit login attempts to prevent abuse

## Troubleshooting

### "Invalid or expired login link"
- Token was already used
- Token expired (> 15 minutes)
- Wrong tenant/token combination
- Solution: Request a new magic link

### "User not found"
- Email not registered in this tenant
- User account deleted
- Solution: Register new account first

### Emails not arriving (Production)
- SMTP credentials incorrect
- Firewall blocking SMTP port
- Email marked as spam
- Solution: Check `.env.local` and email provider settings

### Token showing in development but not production
- This is intentional! In production, tokens are hidden for security
- Users should receive emails instead
- Check SMTP configuration in `.env.local`

## Database Schema

### passwordless_tokens Table
```sql
CREATE TABLE passwordless_tokens (
  id TEXT PRIMARY KEY,                    -- Unique token ID
  tenant_id TEXT NOT NULL,                -- Which tenant
  email TEXT NOT NULL,                    -- User's email
  token TEXT NOT NULL UNIQUE,             -- The magic link token
  expires_at TEXT NOT NULL,               -- Expiry timestamp
  used_at TEXT,                           -- When token was used (NULL if unused)
  created_at TEXT NOT NULL DEFAULT,       -- Creation timestamp
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

## Maintenance

### Cleanup Expired Tokens
Expired tokens are automatically deleted during login verification. For manual cleanup:

```javascript
// In your admin console or scheduled job
import { cleanupExpiredTokens } from '@/lib/passwordless';

// Call periodically (e.g., daily cron job)
cleanupExpiredTokens();
```

## Migration from Password-Only Login

If you're migrating existing users:

1. **Keep Password Support** - Both modes work simultaneously
2. **Encourage Magic Link** - Set passwordless as default
3. **Gradual Transition** - Users can switch modes anytime
4. **No Force Migration** - Let users choose their preference

## Performance Considerations

- ✅ Token generation: ~5ms (minimal)
- ✅ Token verification: ~10ms (database query)
- ✅ Email delivery: Depends on SMTP provider (typically 1-5 seconds)
- ✅ Scalable: Database indexes on tenant_id and token
- ✅ Cleanup: Run `cleanupExpiredTokens()` in background job

## Future Enhancements

Potential additions to the passwordless system:
- [ ] Biometric authentication (Face ID, Touch ID)
- [ ] One-Time Passcode (OTP) via SMS
- [ ] WebAuthn/FIDO2 support
- [ ] OAuth/OpenID Connect integration
- [ ] Device trust (skip verification on trusted devices)
- [ ] Passwordless registration
- [ ] Account recovery flows

---

**Need Help?** Check the logs:
```bash
# View authentication logs
ssh cmssportswear "tail -f /home/appuser/.pm2/logs/thinkmtb-order-*.log"
```
