# SSL Certificate Setup for Subdomains

## Problem Solved ✅

The SSL certificate error for `thinkmtb.cmssportswear.us` has been fixed. The issue was that wildcard certificates (`*.cmssportswear.us`) require DNS validation through Let's Encrypt, which couldn't be done without direct DNS control.

**Solution:** Issue individual certificates for each subdomain using HTTP validation.

## How Certificates Are Set Up

1. **Individual certificates per subdomain** - Each team portal gets its own Let's Encrypt certificate
2. **Automatic renewal** - Certbot automatically renews certificates 30 days before expiry
3. **Nginx server blocks** - Each subdomain gets its own server block with the correct certificate

## Current Certificates

```
✅ thinkmtb.cmssportswear.us
   - Path: /etc/letsencrypt/live/thinkmtb.cmssportswear.us/
   - Expires: 2026-12-02
   - Status: Active

✅ yourteam.cmssportswear.us
   - Path: /etc/letsencrypt/live/yourteam.cmssportswear.us/
   - Expires: 2026-12-01
   - Status: Active

✅ cmssportswear.us
   - Handled by: yourteam certificate (temporary)
   - Recommendation: Issue dedicated certificate when needed
```

## Adding a New Subdomain with SSL

When you create a new team portal subdomain (e.g., `newteam.cmssportswear.us`), follow these steps:

### Step 1: Issue Certificate

```bash
ssh cmssportswear

# Issue certificate for the new subdomain
certbot certonly --nginx -d newteam.cmssportswear.us -n --agree-tos --email admin@regusa.com
```

### Step 2: Add Nginx Server Block

Update `/etc/nginx/sites-available/cmssportswear.us` and add a new server block:

```nginx
# Specific server block for newteam.cmssportswear.us
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name newteam.cmssportswear.us;
    
    # Use the specific certificate for this subdomain
    ssl_certificate /etc/letsencrypt/live/newteam.cmssportswear.us/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/newteam.cmssportswear.us/privkey.pem;
    
    # SSL configuration (copy from another block)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    
    # Logging
    access_log /var/log/nginx/newteam-access.log;
    error_log /var/log/nginx/newteam-error.log;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Step 3: Reload Nginx

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Clearing HSTS Cache in Chrome

If you see an SSL error for a newly configured subdomain:

1. **DevTools method:**
   - Open DevTools: F12 or Cmd+Option+I
   - Go to **Application** tab
   - Click **Cookies** > **Delete all**

2. **Chrome settings method:**
   - Open `chrome://net-internals/#hsts`
   - Enter domain name under "Delete domain security policy"
   - Click "Delete"

3. **Incognito window:**
   - Use Ctrl+Shift+N (Cmd+Shift+N on Mac) to open incognito window
   - Incognito doesn't use cached HSTS policies

## Future: Wildcard Certificate

For a true multi-tenant solution without individual certificates per subdomain, you would need:

1. **DNS control** over `cmssportswear.us`
2. **DNS validation** with Let's Encrypt using `certbot --dns-*` plugin
3. **Wildcard certificate** for `*.cmssportswear.us`

Example (requires DNS plugin):
```bash
certbot certonly \
  --dns-route53 \
  -d cmssportswear.us \
  -d "*.cmssportswear.us" \
  -n --agree-tos --email admin@regusa.com
```

Currently, DNS is not under direct control in this session, so individual certificates per subdomain is the recommended approach.

## Monitoring Certificate Expiry

Check certificate renewal status:
```bash
certbot certificates
```

View renewal logs:
```bash
cat /var/log/letsencrypt/letsencrypt.log
```

## Troubleshooting

### Certificate file not found
```bash
# Check available certificates
ls -la /etc/letsencrypt/live/

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log
```

### Nginx config syntax error
```bash
sudo nginx -t  # Shows exact error
```

### Certificate not renewed
```bash
sudo certbot renew -v  # Verbose renewal attempt
```

## Quick Reference

**Issue certificate for subdomain:**
```bash
ssh cmssportswear
certbot certonly --nginx -d subdomain.cmssportswear.us -n --agree-tos --email admin@regusa.com
```

**Reload Nginx:**
```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Check which certificate is being served:**
```bash
echo | openssl s_client -connect localhost:443 -servername subdomain.cmssportswear.us 2>/dev/null | openssl x509 -noout -text | grep Subject
```

**Certbot auto-renewal is automatic**, but you can manually trigger:
```bash
sudo certbot renew --force-renewal
```
