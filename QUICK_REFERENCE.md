# ThinkMTB Order System - Quick Reference Guide

Quick reference for common commands and operations.

## Installation & Deployment

### Quick Deploy (SQLite)
```bash
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Quick Deploy (PostgreSQL)
```bash
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order
chmod +x scripts/deploy-postgresql.sh
./scripts/deploy-postgresql.sh --domain yourdomain.com
```

### Deploy with Domain & Nginx
```bash
./scripts/deploy.sh --domain yourdomain.com
```

---

## Local Development

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Check code quality
```

---

## Process Management (PM2)

```bash
pm2 status               # Show all processes
pm2 logs thinkmtb-order  # View logs (live)
pm2 restart thinkmtb-order  # Restart app
pm2 stop thinkmtb-order  # Stop app
pm2 start thinkmtb-order # Start app
pm2 delete thinkmtb-order   # Remove from PM2
pm2 monit                # Monitor CPU/memory
pm2 save                 # Save process list for reboot
pm2 startup              # Enable auto-start on reboot
```

---

## Database Operations

### SQLite

```bash
# Open SQLite shell
sqlite3 data/orders.db

# Common queries (from shell)
sqlite3 data/orders.db ".tables"                          # Show tables
sqlite3 data/orders.db ".schema orders"                   # View schema
sqlite3 data/orders.db "SELECT COUNT(*) FROM orders;"    # Count records
sqlite3 data/orders.db "PRAGMA integrity_check;"         # Check integrity

# Backup
cp data/orders.db data/orders.db.backup.$(date +%Y%m%d)

# Restore
cp data/orders.db.backup.20240115 data/orders.db
pm2 restart thinkmtb-order

# Optimize
sqlite3 data/orders.db "VACUUM;"
sqlite3 data/orders.db "PRAGMA optimize;"
```

### PostgreSQL

```bash
# Connect to database
psql -U thinkmtb -d thinkmtb_order

# Common commands
\dt                     # List tables
\d orders               # Show schema
SELECT COUNT(*) FROM orders;  # Count records
\q                      # Exit

# Backup
pg_dump -U thinkmtb -d thinkmtb_order > backup_$(date +%Y%m%d).sql
pg_dump -U thinkmtb -d thinkmtb_order | gzip > backup.sql.gz

# Restore
psql -U thinkmtb -d thinkmtb_order < backup_20240115.sql
gunzip -c backup.sql.gz | psql -U thinkmtb -d thinkmtb_order
```

---

## Nginx Management

```bash
# Check configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/thinkmtb-access.log

# View error logs
sudo tail -f /var/log/nginx/thinkmtb-error.log

# Reload configuration (no restart)
sudo systemctl reload nginx
```

---

## SSL/TLS (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# With auto Nginx configuration
sudo certbot --nginx -d yourdomain.com

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# View certificate info
sudo certbot certificates
```

---

## System Management

```bash
# Check disk usage
df -h

# Check memory
free -h

# Check running processes
ps aux | grep node

# Check port usage
lsof -i :3000
lsof -i :5432    # PostgreSQL
lsof -i :80      # HTTP
lsof -i :443     # HTTPS

# Kill a process
kill -9 PID

# System logs
journalctl -u thinkmtb-order -f     # Application logs
sudo systemctl status postgresql     # Database status
```

---

## Application Logs

```bash
# PM2 logs
pm2 logs thinkmtb-order

# Show last 100 lines
pm2 logs thinkmtb-order --lines 100

# Filter for errors
pm2 logs thinkmtb-order | grep -i error

# System logs (if using systemd)
journalctl -u thinkmtb-order -f
journalctl -u thinkmtb-order -n 50

# Nginx logs
sudo tail -f /var/log/nginx/thinkmtb-error.log
sudo tail -f /var/log/nginx/thinkmtb-access.log
```

---

## Git Operations

```bash
# Clone repository
git clone https://github.com/allen506/thinkmtb-order.git

# Pull latest changes
git pull origin main

# Check status
git status

# View recent commits
git log --oneline -10

# Update and restart
git pull origin main && npm install && npm run build && pm2 restart thinkmtb-order
```

---

## Configuration Management

```bash
# Edit environment variables
nano .env.local

# View current configuration
cat .env.local

# Edit PM2 ecosystem config
nano ecosystem.config.js

# Edit Nginx config
sudo nano /etc/nginx/sites-available/thinkmtb-order

# Backup configuration
cp .env.local .env.local.backup
```

---

## Troubleshooting Quick Fixes

```bash
# Application not responding
pm2 restart thinkmtb-order

# Out of memory
pm2 kill              # Kill PM2
pm2 start ecosystem.config.js  # Restart fresh

# Database locked (SQLite)
rm data/orders.db-wal data/orders.db-shm  # Remove lock files
pm2 restart thinkmtb-order

# Port already in use
lsof -i :3000
kill -9 <PID>

# Nginx not proxying
sudo nginx -t
sudo systemctl restart nginx
curl http://localhost:3000  # Test upstream

# Disk full
df -h
# Delete old backups, logs, or increase disk space

# Check dependencies
npm install
npm audit fix
```

---

## Performance Monitoring

```bash
# Real-time resource monitoring
pm2 monit

# Top processes
top

# Memory usage
free -h
ps aux --sort=-%mem | head -10

# Disk I/O
iostat -x 1

# Network
netstat -tulpn | grep LISTEN

# View PM2 stats
pm2 info thinkmtb-order
```

---

## Backup Strategy

```bash
# Create backup directory
mkdir -p /backups

# SQLite backup
cp data/orders.db /backups/orders.db.backup.$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
pg_dump -U thinkmtb -d thinkmtb_order | gzip > /backups/thinkmtb_$(date +%Y%m%d_%H%M%S).sql.gz

# Configuration backup
cp .env.local /backups/.env.local.backup
cp ecosystem.config.js /backups/ecosystem.config.js.backup

# List recent backups
ls -lh /backups/ | tail -10

# Cleanup old backups (older than 30 days)
find /backups -name "*.backup*" -mtime +30 -delete
find /backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Environment Setup

```bash
# Ubuntu/Debian system updates
sudo apt update
sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential python3 git

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version
npm --version
git --version
psql --version  # If using PostgreSQL
nginx -v
pm2 --version
```

---

## Testing & Validation

```bash
# Test application endpoint
curl http://localhost:3000
curl http://localhost:3000/api/catalog

# Test database connection
# SQLite:
sqlite3 data/orders.db "SELECT 1;"

# PostgreSQL:
psql -U thinkmtb -d thinkmtb_order -c "SELECT 1;"

# Health check script
./scripts/healthcheck.sh

# Test Nginx
sudo nginx -t
curl -I http://yourdomain.com
```

---

## Useful One-Liners

```bash
# Deploy updates
git pull && npm install && npm run build && pm2 restart thinkmtb-order && pm2 save

# Monitor app with auto-refresh (every 5 seconds)
watch -n 5 'pm2 list && echo "---" && pm2 logs thinkmtb-order --lines 20'

# Backup everything
tar -czf /backups/thinkmtb-full-$(date +%Y%m%d).tar.gz . && echo "Backup complete"

# Check app status every 10 seconds
watch -n 10 'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000'

# Find and view application errors from last hour
journalctl -u thinkmtb-order --since "1 hour ago" -e

# Kill and restart from scratch
pm2 kill && sleep 2 && pm2 start ecosystem.config.js && pm2 save
```

---

## Documentation Links

- **Full Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Database Configuration**: See [DATABASE.md](./DATABASE.md)
- **Project README**: See [README.md](./README.md)
- **Environment Template**: See [.env.example](./.env.example)

---

## Emergency Contact

For critical issues:
- Check logs: `pm2 logs thinkmtb-order`
- Verify database: `sqlite3 data/orders.db ".tables"` or `psql -U thinkmtb -d thinkmtb_order -c "SELECT 1;"`
- Check disk: `df -h`
- Check memory: `free -h`
- See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for detailed troubleshooting
