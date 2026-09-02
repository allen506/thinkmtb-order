# VPS Security & Deployment Best Practices

This guide covers security hardening and proper user management for VPS deployments.

## Table of Contents

1. [Initial VPS Setup](#initial-vps-setup)
2. [User Management](#user-management)
3. [SSH Security](#ssh-security)
4. [Firewall Configuration](#firewall-configuration)
5. [Deployment User Setup](#deployment-user-setup)
6. [Application Permissions](#application-permissions)
7. [Backup User](#backup-user)
8. [Monitoring User](#monitoring-user)
9. [Security Checklist](#security-checklist)

## Initial VPS Setup

**NEVER use root for day-to-day operations!**

### Step 1: Login as Root (First Time Only)

```bash
# SSH to your VPS with root (temporary)
ssh root@74.208.132.71

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop ufw fail2ban
```

### Step 2: Create a Sudo User (Recommended)

```bash
# Create new user called 'deploy'
useradd -m -s /bin/bash deploy

# Add user to sudoers group
usermod -aG sudo deploy

# Set password
passwd deploy
# Enter secure password when prompted
```

### Step 3: Configure SSH Key Authentication

**On your Mac (local):**
```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/vps_key -C "vps@cmssportswear.us"
# Just press Enter when prompted for passphrase

# Copy public key
cat ~/.ssh/vps_key.pub
```

**On VPS as root:**
```bash
# Switch to deploy user
su - deploy

# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
cat >> ~/.ssh/authorized_keys << 'EOF'
# Paste your public key here (ssh-ed25519 ...)
EOF

# Secure the file
chmod 600 ~/.ssh/authorized_keys
```

**Test SSH from Mac:**
```bash
ssh -i ~/.ssh/vps_key deploy@74.208.132.71

# You should login without a password!
```

### Step 4: Disable Root SSH and Password Login

**As root:**
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Make these changes:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

## User Management

### Create Application User

```bash
# Create app-specific user (not deploy, not root)
sudo useradd -m -s /bin/bash appuser

# Set password (for emergencies)
sudo passwd appuser

# Add to sudo group (optional, for app management)
sudo usermod -aG sudo appuser
```

### User Roles

| User | Purpose | SSH Access | Sudo | Notes |
|------|---------|-----------|------|-------|
| root | System admin | Disabled | Yes | Only for emergencies |
| deploy | Deployment & management | Yes (key) | Yes | Main deployment account |
| appuser | App runtime | No | No | Runs the application |
| backup | Backup operations | Yes (key) | Yes | Automated backups |
| monitor | System monitoring | No | No | Monitoring agent |

### Create Backup User

```bash
sudo useradd -m -s /bin/bash backup
sudo usermod -aG sudo backup

# Generate SSH key for automated backups
sudo -u backup ssh-keygen -t ed25519 -N "" -f /home/backup/.ssh/backup_key
sudo -u backup bash -c 'cat /home/backup/.ssh/backup_key.pub >> /home/backup/.ssh/authorized_keys'
```

### Create Monitoring User

```bash
sudo useradd -m -s /bin/bash monitor
# No sudo access for monitoring

# Create monitoring config directory
sudo mkdir -p /etc/monitor
sudo chown monitor:monitor /etc/monitor
sudo chmod 700 /etc/monitor
```

## SSH Security

### SSH Config for All Users

```bash
# /etc/ssh/sshd_config

# General Security
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no

# Timeout settings
ClientAliveInterval 60
ClientAliveCountMax 2

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Restart after changes
sudo systemctl restart sshd
```

### SSH Config on Your Mac

```bash
# ~/.ssh/config

Host vps-deploy
    HostName 74.208.132.71
    User deploy
    IdentityFile ~/.ssh/vps_key
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host vps-backup
    HostName 74.208.132.71
    User backup
    IdentityFile /path/to/backup_key
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
```

**Quick login:**
```bash
ssh vps-deploy
ssh vps-backup
```

## Firewall Configuration

### Setup UFW (Uncomplicated Firewall)

```bash
# Enable firewall
sudo ufw enable

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status verbose

# Deny specific attempts
sudo ufw deny from 192.168.1.100  # Block specific IP
```

### Fail2Ban Configuration

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create SSH jail
sudo tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[recidive]
enabled = true
filter = recidive
action = iptables-multiport[name=Recidive, port="http,https,ssh"]
logpath = /var/log/fail2ban.log
bantime = 86400
findtime = 86400
maxretry = 5
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
```

## Deployment User Setup

### Setup Directory Structure

**As deploy user:**
```bash
sudo -u deploy mkdir -p /opt/thinkmtb-order
sudo chown -R deploy:deploy /opt/thinkmtb-order
sudo chmod 755 /opt/thinkmtb-order
```

### Clone Repository

**As deploy user:**
```bash
ssh vps-deploy
cd /opt/thinkmtb-order
git clone https://github.com/yourusername/thinkmtb-order.git .

# Permissions
chmod 755 scripts/*.sh
```

### Run Deployment Script

**As deploy user (with sudo where needed):**
```bash
cd /opt/thinkmtb-order
sudo ./scripts/deploy-postgresql.sh \
  --domain cmssportswear.us \
  --db-password "secure-db-password" \
  --app-user appuser
```

## Application Permissions

### Directory Structure After Deployment

```
/opt/thinkmtb-order/
├── src/                  → deploy:deploy (755)
├── scripts/              → deploy:deploy (755)
├── node_modules/         → appuser:appuser (755)
├── .env.local            → appuser:appuser (600)
├── data/
│   └── orders.db         → appuser:appuser (600)
└── logs/
    └── app.log           → appuser:appuser (644)
```

### Set Correct Permissions

```bash
# Source code (readable by app, writable by deploy)
sudo chown -R deploy:deploy /opt/thinkmtb-order/src
sudo chown -R deploy:deploy /opt/thinkmtb-order/scripts
sudo chmod 755 /opt/thinkmtb-order/src
sudo chmod 755 /opt/thinkmtb-order/scripts

# Application runtime (owned by appuser)
sudo chown -R appuser:appuser /opt/thinkmtb-order/node_modules
sudo chown appuser:appuser /opt/thinkmtb-order/.env.local
sudo chmod 600 /opt/thinkmtb-order/.env.local

# Database (owned by appuser)
sudo chown appuser:appuser /opt/thinkmtb-order/data
sudo chown appuser:appuser /opt/thinkmtb-order/data/orders.db*
sudo chmod 700 /opt/thinkmtb-order/data
sudo chmod 600 /opt/thinkmtb-order/data/orders.db

# Logs
sudo chown appuser:appuser /opt/thinkmtb-order/logs
sudo chmod 755 /opt/thinkmtb-order/logs
```

### PM2 Ecosystem File

Create `/opt/thinkmtb-order/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'thinkmtb-order',
      script: 'npm',
      args: 'start',
      cwd: '/opt/thinkmtb-order',
      user: 'appuser',  // Run as appuser, not root!
      
      // Logging
      error_file: '/opt/thinkmtb-order/logs/error.log',
      out_file: '/opt/thinkmtb-order/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      restart_delay: 4000,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### Start Application with PM2

```bash
# Install PM2 globally (as deploy/sudo)
sudo npm install -g pm2

# Start application as appuser
sudo -u appuser pm2 start ecosystem.config.js

# Setup startup hook
sudo pm2 startup -u appuser --hp /home/appuser
sudo pm2 save

# Verify
pm2 status
pm2 logs
```

## Backup User

### Setup Automated Backups

**As root, create backup script:**

```bash
sudo tee /home/backup/backup.sh > /dev/null << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/backup/backups"
DB_PATH="/opt/thinkmtb-order/data/orders.db"
RETENTION_DAYS=30

# Create backup
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/orders_$DATE.db"

# Backup database
cp $DB_PATH $BACKUP_FILE
gzip $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

# Make executable
sudo chmod 755 /home/backup/backup.sh
sudo chown backup:backup /home/backup/backup.sh
```

**Add to crontab:**

```bash
# As backup user
sudo -u backup crontab -e

# Add this line (daily at 2 AM)
0 2 * * * /home/backup/backup.sh
```

## Monitoring User

### Setup Monitoring Permissions

```bash
# Monitor can read logs and status
sudo usermod -aG adm monitor
sudo usermod -aG systemd-journal monitor

# Monitor can run specific commands without password
echo "monitor ALL=(ALL) NOPASSWD: /bin/systemctl status thinkmtb-order" | sudo tee /etc/sudoers.d/monitor-status
echo "monitor ALL=(ALL) NOPASSWD: /usr/bin/tail -n 100 /var/log/syslog" | sudo tee /etc/sudoers.d/monitor-logs
```

## Security Checklist

Before going live, verify:

### Access Control
- [ ] Root SSH login disabled
- [ ] Password authentication disabled (SSH keys only)
- [ ] Deploy user has sudo privileges
- [ ] App user has no sudo privileges
- [ ] Backup user has limited sudo access
- [ ] Monitor user has read-only access

### File Permissions
- [ ] Source code owned by deploy:deploy
- [ ] Application runtime owned by appuser:appuser
- [ ] `.env.local` is 600 (readable by appuser only)
- [ ] Database is 600 (readable by appuser only)
- [ ] Scripts are executable (755)

### Firewall
- [ ] UFW enabled
- [ ] SSH port 22 allowed
- [ ] HTTP port 80 allowed
- [ ] HTTPS port 443 allowed
- [ ] All other ports denied
- [ ] Fail2ban enabled

### SSH Security
- [ ] SSH keys generated for all users
- [ ] SSH keys added to `authorized_keys`
- [ ] `sshd_config` hardened
- [ ] SSH port (default 22) only accessible internally or from known IPs

### Application Security
- [ ] PM2 running as appuser (not root)
- [ ] Environment variables in `.env.local` (not in code)
- [ ] Database backups automated
- [ ] SSL/TLS certificates configured
- [ ] No hardcoded passwords in repository

### Monitoring
- [ ] Application health checks in place
- [ ] Logs being collected
- [ ] Monitoring user setup for alerts
- [ ] Backup verification schedule

## Quick Reference Commands

### User Management
```bash
# Create user
sudo useradd -m -s /bin/bash username

# Add to sudo
sudo usermod -aG sudo username

# List users
cut -d: -f1 /etc/passwd

# Change user password
sudo passwd username
```

### File Permissions
```bash
# Change ownership
sudo chown -R user:group /path/to/dir

# Change permissions
sudo chmod 755 /path/to/dir     # rwxr-xr-x
sudo chmod 644 /path/to/file    # rw-r--r--
sudo chmod 600 /path/to/secret  # rw------- (for secrets)
```

### SSH
```bash
# Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/key_name

# Add to authorized_keys
cat ~/.ssh/key.pub | sudo tee -a /home/user/.ssh/authorized_keys

# Test SSH
ssh -i ~/.ssh/vps_key user@host
```

### Process Management
```bash
# View processes
ps aux | grep node

# Kill process
kill -9 PID

# View ports
sudo netstat -tlnp | grep :3000
```

### Firewall
```bash
# UFW commands
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw deny 22/tcp
sudo ufw delete allow 80/tcp
```

### Backups
```bash
# Manual backup
sudo -u backup /home/backup/backup.sh

# List backups
ls -lh /home/backup/backups/

# Restore backup
cp /home/backup/backups/orders_YYYYMMDD_HHMMSS.db.gz /opt/thinkmtb-order/data/
gunzip /opt/thinkmtb-order/data/orders_*.db.gz
```

## Troubleshooting

### Can't SSH as deploy user
```bash
# Verify SSH key has correct permissions
ssh -vvv deploy@74.208.132.71

# Check authorized_keys
sudo -u deploy cat /home/deploy/.ssh/authorized_keys

# Fix permissions
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### Permission denied errors in app
```bash
# Check ownership
ls -la /opt/thinkmtb-order/data/

# Fix ownership
sudo chown appuser:appuser /opt/thinkmtb-order/data/orders.db
sudo chmod 600 /opt/thinkmtb-order/data/orders.db
```

### PM2 not starting as appuser
```bash
# Check PM2 status
sudo -u appuser pm2 status

# View errors
sudo -u appuser pm2 logs

# Restart
sudo -u appuser pm2 restart all
```

### Firewall blocking traffic
```bash
# Verify rules
sudo ufw status numbered

# Temporarily disable (dangerous!)
sudo ufw disable

# Re-enable
sudo ufw enable
```

## Summary

**Security Best Practices Applied:**
✅ Never use root for applications
✅ SSH key authentication only
✅ Separate users for different roles
✅ Proper file permissions
✅ Firewall enabled and configured
✅ Fail2ban protecting SSH
✅ Automated backups with retention
✅ Application runs as limited user
✅ Secrets stored in `.env.local` (not in repo)
✅ Minimal sudo privileges per user

---

**Last Updated**: 2024-01-15
**Version**: 1.0 (Security Best Practices)
