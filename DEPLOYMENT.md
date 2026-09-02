# ThinkMTB Order System - Deployment Guide

Complete guide for deploying the ThinkMTB Order Management System on cloud VMs or local Ubuntu machines.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start](#quick-start)
3. [Detailed Installation](#detailed-installation)
4. [Database Configuration](#database-configuration)
5. [Production Deployment](#production-deployment)
6. [Nginx Configuration](#nginx-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or later (or any Linux with similar package management)
- **RAM**: 2GB (4GB recommended for production)
- **Disk**: 10GB+ (for database and uploads)
- **CPU**: 2 cores minimum
- **Node.js**: 18.x or later
- **npm**: 9.x or later

### Optional Software
- **PostgreSQL**: 13+ (if using PostgreSQL instead of SQLite)
- **Nginx**: 1.18+ (for reverse proxy)
- **PM2**: Global process manager for Node.js
- **Git**: 2.25+

### Supported Databases
- **SQLite** (default) - Good for small to medium deployments
- **PostgreSQL** (optional) - Recommended for high-traffic or multi-instance deployments

---

## Quick Start

### For Developers (Local Development)

```bash
# Clone repository
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order

# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Run development server
npm run dev
```

Access at `http://localhost:3000`

### For Deployment (Automated Script)

```bash
# Clone repository
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order

# Run deployment script (uses SQLite by default)
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Or with PostgreSQL
chmod +x scripts/deploy-postgresql.sh
./scripts/deploy-postgresql.sh
```

---

## Detailed Installation

### Step 1: System Preparation

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x or later
npm --version   # Should be 9.x or later

# Install git
sudo apt install -y git

# Install build tools (required for better-sqlite3)
sudo apt install -y build-essential python3
```

### Step 2: Clone Repository

```bash
# Choose deployment directory (e.g., /opt, /var/www, or home directory)
cd /opt

# Clone repository
git clone https://github.com/allen506/thinkmtb-order.git thinkmtb-order
cd thinkmtb-order

# Set proper permissions
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit configuration
nano .env.local
```

**Key environment variables** (see `.env.example` for all options):
```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com

# Database (see Database Configuration section)
DATABASE_TYPE=sqlite  # or postgresql
DATABASE_URL=sqlite:./data/orders.db

# Authentication
ADMIN_PASSWORD=YourSecurePasswordHere

# SMTP (email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment Methods
PAYMENT_ZELLE=
PAYMENT_VENMO=
PAYMENT_PAYPAL=
PAYMENT_CASH=Pay in person

# Session/Security
SESSION_TIMEOUT_MINUTES=15
ARCHIVE_RETENTION_DAYS=365
```

### Step 4: Install Dependencies

```bash
npm install

# If build fails due to better-sqlite3, ensure build tools are installed:
# sudo apt install -y build-essential python3
```

### Step 5: Build Application

```bash
npm run build

# Verify build completed successfully
ls -la .next/
```

### Step 6: Test Application

```bash
# Start production server
npm start

# In another terminal, test endpoint
curl http://localhost:3000

# View logs
tail -f logs/app.log  # If logging is configured
```

### Step 7: Set Up Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Enable startup on reboot
pm2 startup systemd -u $USER --hp /home/$USER
# Copy and run the command output by previous step

# Verify it's running
pm2 status
pm2 logs
```

---

## Database Configuration

### Using SQLite (Default)

SQLite is suitable for small to medium deployments and requires no additional setup.

**Automatic Setup:**
The database initializes automatically on first run. Required tables and indexes are created in `./data/orders.db`.

**Backup Strategy:**
```bash
# Manual backup
cp data/orders.db data/orders.db.backup.$(date +%Y%m%d_%H%M%S)

# Automated daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * cp /path/to/thinkmtb-order/data/orders.db /backups/orders.db.backup.\$(date +\%Y\%m\%d)") | crontab -

# Restore from backup
cp data/orders.db.backup.20240101 data/orders.db
```

### Using PostgreSQL

PostgreSQL is recommended for high-traffic deployments or multi-instance setups.

#### Step 1: Install PostgreSQL

```bash
# Install PostgreSQL 13+
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo sudo -u postgres psql --version
```

#### Step 2: Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Run these commands in PostgreSQL console:
CREATE USER thinkmtb WITH PASSWORD 'secure_password_here';
CREATE DATABASE thinkmtb_order OWNER thinkmtb;
ALTER USER thinkmtb CREATEDB;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE thinkmtb_order TO thinkmtb;
\connect thinkmtb_order
GRANT ALL PRIVILEGES ON SCHEMA public TO thinkmtb;

# Exit
\q
```

#### Step 3: Configure Application for PostgreSQL

```bash
# Edit .env.local
nano .env.local

# Set these variables:
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://thinkmtb:secure_password_here@localhost:5432/thinkmtb_order
```

#### Step 4: Migrate SQLite to PostgreSQL

See [DATABASE.md](./DATABASE.md) for detailed migration instructions.

#### Step 5: Backup Strategy

```bash
# Manual backup
pg_dump -U thinkmtb thinkmtb_order > backup-$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (add to crontab)
0 2 * * * pg_dump -U thinkmtb thinkmtb_order > /backups/thinkmtb_order.sql
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Node.js v18+ installed
- [ ] Repository cloned and `.env.local` configured
- [ ] Database initialized and tested
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] Firewall rules configured (see below)
- [ ] SSL certificates obtained (Let's Encrypt recommended)
- [ ] Domain name configured
- [ ] Email (SMTP) configured for notifications
- [ ] PM2 or systemd configured for auto-restart

### Firewall Configuration

```bash
# If using UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Node.js (if not behind Nginx)

# If using Nginx (recommended)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# No need to expose 3000 if Nginx is reverse proxy
```

### SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already enabled by Certbot)
sudo systemctl status certbot.timer

# Verify renewal test
sudo certbot renew --dry-run
```

### Nginx Reverse Proxy Configuration

See [Nginx Configuration](#nginx-configuration) section below.

### Systemd Service Alternative to PM2

Create `/etc/systemd/system/thinkmtb-order.service`:

```ini
[Unit]
Description=ThinkMTB Order System
After=network.target

[Service]
Type=simple
User=thinkmtb
WorkingDirectory=/opt/thinkmtb-order
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/thinkmtb-order.log
StandardError=append:/var/log/thinkmtb-order.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable thinkmtb-order
sudo systemctl start thinkmtb-order
sudo systemctl status thinkmtb-order
```

---

## Nginx Configuration

### Basic Setup

```bash
# Install Nginx
sudo apt install -y nginx

# Copy configuration
sudo cp nginx-thinkmtb.conf /etc/nginx/sites-available/thinkmtb-order.conf

# Edit for your domain
sudo nano /etc/nginx/sites-available/thinkmtb-order.conf
```

### Configuration Template with SSL

Create `/etc/nginx/sites-available/thinkmtb-order`:

```nginx
upstream thinkmtb_backend {
    server localhost:3000;
    keepalive 64;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Logging
    access_log /var/log/nginx/thinkmtb-access.log;
    error_log /var/log/nginx/thinkmtb-error.log;
    
    # Client upload limit
    client_max_body_size 50M;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    
    location / {
        proxy_pass http://thinkmtb_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://thinkmtb_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and test:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/thinkmtb-order /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View all processes
pm2 status

# View logs in real-time
pm2 logs thinkmtb-order

# Monitor system resources
pm2 monit

# Save current state (survives reboot)
pm2 save
```

### Application Logs

```bash
# View application logs
tail -f logs/app.log

# View Nginx logs
sudo tail -f /var/log/nginx/thinkmtb-access.log
sudo tail -f /var/log/nginx/thinkmtb-error.log

# View system logs (if using systemd)
journalctl -u thinkmtb-order -f
```

### Health Checks

```bash
# Test application endpoint
curl https://yourdomain.com/api/health

# Test database
curl https://yourdomain.com/api/catalog

# Monitor uptime
watch -n 60 'curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com'
```

### Regular Maintenance

```bash
# Weekly: Check disk usage
df -h

# Weekly: Database maintenance
npm run db:vacuum  # If implemented

# Monthly: Update dependencies
npm outdated
npm update

# Monthly: Review and rotate logs
sudo logrotate -f /etc/logrotate.d/thinkmtb-order
```

### Database Maintenance

```bash
# SQLite: Optimize database
sqlite3 data/orders.db "VACUUM;"

# PostgreSQL: Analyze and vacuum
sudo -u postgres psql -d thinkmtb_order -c "VACUUM ANALYZE;"
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check Node.js installation
node --version

# Try starting manually
npm start

# Check logs
pm2 logs thinkmtb-order
journalctl -u thinkmtb-order -n 50

# Check port availability
sudo lsof -i :3000
```

### Database Connection Issues

**SQLite:**
```bash
# Check database file exists and is readable
ls -l data/orders.db

# Test SQLite
sqlite3 data/orders.db ".tables"

# Check permissions
chmod 644 data/orders.db
chmod 755 data/
```

**PostgreSQL:**
```bash
# Test connection
psql -U thinkmtb -d thinkmtb_order -c "SELECT NOW();"

# Check PostgreSQL is running
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### High CPU or Memory Usage

```bash
# Monitor resource usage
pm2 monit

# Check memory leaks
pm2 describe thinkmtb-order | grep memory

# Restart application
pm2 restart thinkmtb-order

# Increase max_memory_restart if needed
# Edit ecosystem.config.js and update max_memory_restart value
```

### Nginx Proxy Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx is running
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/thinkmtb-error.log

# Check upstream connectivity
curl http://localhost:3000
```

### Database Locks (SQLite)

```bash
# Check for locks
lsof data/orders.db

# If stuck, restart application
pm2 restart thinkmtb-order

# Or check WAL mode (journal mode)
sqlite3 data/orders.db "PRAGMA journal_mode;"
```

### Permission Denied Errors

```bash
# Check file ownership
ls -l data/ logs/ public/

# Fix permissions
sudo chown -R $USER:$USER .
chmod -R 755 . && find . -type f -exec chmod 644 {} \;

# For Nginx access
sudo chown -R www-data:www-data /opt/thinkmtb-order/public
```

---

## Performance Optimization

### Application Level

- Enable caching headers in `.env.local`:
  ```env
  CACHE_ENABLED=true
  CACHE_MAX_AGE=3600
  ```

- Use connection pooling for PostgreSQL (if implemented)

### Database Level

- Create indexes for frequently queried columns
- Archive old campaigns to keep active database small
- Regular VACUUM/ANALYZE operations

### Server Level

- Enable Gzip compression (in Nginx config above)
- Use CDN for static assets
- Enable HTTP/2
- Optimize image delivery via API endpoint

### PM2 Optimization

```bash
# Edit ecosystem.config.js for production
# - Increase instances for CPU cores
# - Adjust max_memory_restart based on server RAM
# - Set appropriate restart_delay
```

---

## Updating to Latest Version

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart thinkmtb-order

# Verify update
pm2 logs thinkmtb-order | head -20
```

---

## Getting Help

- Check logs: `pm2 logs thinkmtb-order`
- Review `.env.local` for misconfigurations
- Test database connectivity separately
- Check firewall and Nginx configurations
- Review system resources: `top`, `free -h`, `df -h`

For additional support, refer to the main README.md and DATABASE.md files.
