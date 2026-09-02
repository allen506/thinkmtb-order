#!/bin/bash

##############################################################################
# ThinkMTB Order System - Secure Deployment Script (PostgreSQL)
# 
# SECURITY-FOCUSED VERSION
# - Runs as non-root user
# - Creates dedicated application user
# - Proper file permissions
# - SSH key setup
# - Firewall configuration
# 
# Usage: ./deploy-postgresql-secure.sh [--domain yourdomain.com] [--db-password password]
#
# Prerequisites:
# - Run from a sudo-enabled user account (NOT root)
# - Ubuntu 20.04+ VPS
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DOMAIN=""
NGINX_SETUP=false
APP_DIR="/opt/thinkmtb-order"
NODE_PORT=3000

# User configuration
DEPLOY_USER="deploy"
APP_USER="appuser"
BACKUP_USER="backup"

# Database configuration
DB_NAME="cmssportswear_prod"
DB_USER="thinkmtb"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT=5432

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)
      DOMAIN="$2"
      NGINX_SETUP=true
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check if NOT running as root (security!)
check_not_root() {
  if [[ $EUID -eq 0 ]]; then
    log_error "SECURITY: This script should NOT be run as root!"
    log_error "Please run as a sudo-enabled user (e.g., deploy user)"
    exit 1
  fi
  
  # Check if user has sudo privileges
  if ! sudo -l &> /dev/null; then
    log_error "Current user does not have sudo privileges"
    exit 1
  fi
  
  log_success "Running as: $USER (with sudo access)"
}

# Generate secure password
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Create application user (if not exists)
create_app_user() {
  log_info "Checking application user..."
  
  if id "$APP_USER" &>/dev/null; then
    log_success "App user '$APP_USER' already exists"
  else
    log_info "Creating app user: $APP_USER"
    sudo useradd -m -s /bin/bash "$APP_USER"
    log_success "App user created"
  fi
  
  # Create .ssh directory for app user (for future automated deployments)
  sudo mkdir -p /home/$APP_USER/.ssh
  sudo chown $APP_USER:$APP_USER /home/$APP_USER/.ssh
  sudo chmod 700 /home/$APP_USER/.ssh
}

# Create backup user (if not exists)
create_backup_user() {
  log_info "Checking backup user..."
  
  if id "$BACKUP_USER" &>/dev/null; then
    log_success "Backup user '$BACKUP_USER' already exists"
  else
    log_info "Creating backup user: $BACKUP_USER"
    sudo useradd -m -s /bin/bash "$BACKUP_USER"
    sudo usermod -aG sudo "$BACKUP_USER"
    log_success "Backup user created with sudo access"
  fi
}

# Install system dependencies
install_dependencies() {
  log_info "Installing system dependencies..."
  
  # Update package lists
  log_info "Updating package lists..."
  sudo apt-get update -qq
  
  # Check and install Node.js
  if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &>/dev/null
    sudo apt-get install -y nodejs &>/dev/null
  else
    NODE_VERSION=$(node --version)
    log_success "Node.js already installed: $NODE_VERSION"
  fi
  
  # Install build tools
  if ! command -v gcc &> /dev/null; then
    log_info "Installing build tools..."
    sudo apt-get install -y build-essential python3 &>/dev/null
  else
    log_success "Build tools already installed"
  fi
  
  # Install PostgreSQL
  if ! command -v psql &> /dev/null; then
    log_info "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib postgresql-client &>/dev/null
  else
    PG_VERSION=$(psql --version)
    log_success "PostgreSQL already installed: $PG_VERSION"
  fi
  
  # Install PM2
  if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    sudo npm install -g pm2 &>/dev/null
  else
    PM2_VERSION=$(pm2 --version)
    log_success "PM2 already installed: $PM2_VERSION"
  fi
  
  # Install UFW (firewall)
  if ! command -v ufw &> /dev/null; then
    log_info "Installing UFW..."
    sudo apt-get install -y ufw &>/dev/null
  else
    log_success "UFW already installed"
  fi
  
  # Install Fail2Ban
  if ! command -v fail2ban-client &> /dev/null; then
    log_info "Installing Fail2Ban..."
    sudo apt-get install -y fail2ban &>/dev/null
  else
    log_success "Fail2Ban already installed"
  fi
  
  log_success "System dependencies installed"
}

# Setup PostgreSQL database
setup_postgresql() {
  log_info "Setting up PostgreSQL database..."
  
  # Generate password if not provided
  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_password)
  fi
  
  # Start PostgreSQL
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  
  # Create database user if not exists
  if sudo -u postgres psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1; then
    log_success "Database user '$DB_USER' already exists"
  else
    log_info "Creating database user: $DB_USER"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
  fi
  
  # Create database if not exists
  if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    log_success "Database '$DB_NAME' already exists"
  else
    log_info "Creating database: $DB_NAME"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
  fi
  
  # Grant privileges
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
  
  log_success "PostgreSQL setup complete"
}

# Setup application directory
setup_app_directory() {
  log_info "Setting up application directory..."
  
  # Create app directory
  if [ ! -d "$APP_DIR" ]; then
    log_info "Creating app directory: $APP_DIR"
    sudo mkdir -p "$APP_DIR"
  fi
  
  # Set ownership to deploy user
  sudo chown $USER:$USER "$APP_DIR"
  sudo chmod 755 "$APP_DIR"
  
  log_success "Application directory ready: $APP_DIR"
}

# Clone repository
clone_repository() {
  log_info "Cloning repository..."
  
  if [ ! -d "$APP_DIR/.git" ]; then
    log_info "Repository not found, cloning..."
    git clone https://github.com/allen506/thinkmtb-order.git "$APP_DIR"
  else
    log_info "Repository already exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
  fi
  
  cd "$APP_DIR"
  log_success "Repository ready"
}

# Build application
build_application() {
  log_info "Building application..."
  
  cd "$APP_DIR"
  
  # Install dependencies
  log_info "Installing npm packages..."
  npm install --production
  
  # Build Next.js
  log_info "Building Next.js application..."
  npm run build
  
  log_success "Application built successfully"
}

# Create environment file
create_env_file() {
  log_info "Creating environment configuration..."
  
  ENV_FILE="$APP_DIR/.env.local"
  
  if [ -f "$ENV_FILE" ]; then
    log_warning "Environment file already exists: $ENV_FILE"
    return
  fi
  
  cat > "$ENV_FILE" << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=$NODE_PORT
APP_URL=https://${DOMAIN:-localhost}

# Database (PostgreSQL)
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Platform Admin
PLATFORM_ADMIN_EMAIL=admin@${DOMAIN:-localhost}
PLATFORM_ADMIN_PASSWORD=$(generate_password)

# SMTP (Global email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@${DOMAIN:-localhost}
SMTP_FROM_NAME=CMS Sports Order System

# Session & Security
SESSION_TIMEOUT_MINUTES=15
ARCHIVE_RETENTION_DAYS=365
EOF
  
  # Secure permissions
  sudo chown $APP_USER:$APP_USER "$ENV_FILE"
  sudo chmod 600 "$ENV_FILE"
  
  log_success "Environment file created: $ENV_FILE"
  log_warning "⚠ UPDATE the .env.local file with your SMTP credentials before deploying!"
  cat "$ENV_FILE"
}

# Set proper permissions
set_permissions() {
  log_info "Setting proper file permissions..."
  
  # Application code (owned by deploy user for updates)
  sudo chown -R $USER:$USER "$APP_DIR/src"
  sudo chown -R $USER:$USER "$APP_DIR/scripts"
  sudo chmod 755 "$APP_DIR/src"
  sudo chmod 755 "$APP_DIR/scripts"
  
  # Node modules (owned by app user)
  sudo chown -R $APP_USER:$APP_USER "$APP_DIR/node_modules"
  sudo chown -R $APP_USER:$APP_USER "$APP_DIR/.next"
  
  # Environment file (app user only)
  sudo chown $APP_USER:$APP_USER "$APP_DIR/.env.local"
  sudo chmod 600 "$APP_DIR/.env.local"
  
  # Data directory
  sudo mkdir -p "$APP_DIR/data" "$APP_DIR/logs"
  sudo chown $APP_USER:$APP_USER "$APP_DIR/data" "$APP_DIR/logs"
  sudo chmod 700 "$APP_DIR/data"
  sudo chmod 755 "$APP_DIR/logs"
  
  # Database file (if using SQLite)
  if [ -f "$APP_DIR/data/orders.db" ]; then
    sudo chown $APP_USER:$APP_USER "$APP_DIR/data/orders.db"
    sudo chmod 600 "$APP_DIR/data/orders.db"
  fi
  
  log_success "File permissions set correctly"
}

# Setup PM2
setup_pm2() {
  log_info "Setting up PM2 process manager..."
  
  cd "$APP_DIR"
  
  # Copy ecosystem config if exists
  if [ ! -f "$APP_DIR/ecosystem.config.js" ]; then
    log_info "Creating PM2 ecosystem file..."
    cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'thinkmtb-order',
      script: 'npm',
      args: 'start',
      cwd: '/opt/thinkmtb-order',
      user: 'appuser',
      error_file: '/opt/thinkmtb-order/logs/error.log',
      out_file: '/opt/thinkmtb-order/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 4000,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
EOF
  fi
  
  # Start with PM2 as app user
  log_info "Starting application with PM2..."
  sudo -u $APP_USER pm2 start ecosystem.config.js
  
  # Setup startup hook
  sudo env PATH=$PATH:/usr/local/bin pm2 startup -u $APP_USER --hp /home/$APP_USER
  sudo -u $APP_USER pm2 save
  
  log_success "PM2 configured and application started"
  
  # Show status
  sudo -u $APP_USER pm2 status
}

# Setup firewall
setup_firewall() {
  log_info "Configuring firewall (UFW)..."
  
  # Enable UFW
  sudo ufw --force enable
  
  # Default policies
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  
  # Allow SSH
  sudo ufw allow 22/tcp
  
  # Allow HTTP/HTTPS
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  
  # Show status
  sudo ufw status
  
  log_success "Firewall configured"
}

# Setup Fail2Ban
setup_fail2ban() {
  log_info "Configuring Fail2Ban..."
  
  sudo tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF
  
  sudo systemctl restart fail2ban
  
  log_success "Fail2Ban configured"
}

# Backup script
create_backup_script() {
  log_info "Creating backup script..."
  
  sudo tee /home/$BACKUP_USER/backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/backup/backups"
DB_NAME="cmssportswear_prod"
DB_USER="thinkmtb"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cmssportswear_$DATE.sql"

# Backup PostgreSQL
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE.gz

# Backup application data
tar -czf "$BACKUP_DIR/appdata_$DATE.tar.gz" /opt/thinkmtb-order/data

# Cleanup old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF
  
  sudo chmod 755 /home/$BACKUP_USER/backup.sh
  sudo chown $BACKUP_USER:$BACKUP_USER /home/$BACKUP_USER/backup.sh
  
  # Add to crontab (daily at 2 AM)
  (sudo -u $BACKUP_USER crontab -l 2>/dev/null; echo "0 2 * * * /home/$BACKUP_USER/backup.sh") | sudo -u $BACKUP_USER crontab -
  
  log_success "Backup script created"
}

# Print summary
print_summary() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         Deployment Completed Successfully! 🎉                  ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "📊 Deployment Summary:"
  echo "  Application Directory: $APP_DIR"
  echo "  Deploy User: $DEPLOY_USER"
  echo "  App User: $APP_USER"
  echo "  Backup User: $BACKUP_USER"
  echo "  Database: $DB_NAME"
  echo "  Domain: ${DOMAIN:-not configured}"
  echo ""
  echo "🔐 Security:"
  echo "  ✓ Application runs as non-root user ($APP_USER)"
  echo "  ✓ Firewall enabled (UFW)"
  echo "  ✓ Fail2Ban protecting SSH"
  echo "  ✓ Automated daily backups"
  echo "  ✓ Proper file permissions"
  echo ""
  echo "📝 Important Next Steps:"
  echo "  1. Edit .env.local with SMTP credentials:"
  echo "     nano $APP_DIR/.env.local"
  echo ""
  echo "  2. Setup SSL/TLS (Let's Encrypt):"
  echo "     sudo apt install -y certbot python3-certbot-nginx"
  echo "     sudo certbot certonly --standalone -d $DOMAIN -d *.$DOMAIN"
  echo ""
  echo "  3. (Optional) Setup Nginx reverse proxy"
  echo ""
  echo "  4. Create first tenant:"
  echo "     curl -X POST http://localhost:$NODE_PORT/api/platform-admin/tenants"
  echo ""
  echo "💻 Application Status:"
  sudo -u $APP_USER pm2 status
  echo ""
  echo "🌐 Access:"
  echo "  Application URL: https://${DOMAIN:-localhost}"
  echo "  Admin Portal: https://admin.${DOMAIN:-localhost}/platform-admin"
  echo ""
  echo "📚 Documentation:"
  echo "  - SAAS_PLATFORM.md - Deployment guide"
  echo "  - SECURITY.md - Security best practices"
  echo "  - MULTI_TENANCY.md - Multi-tenancy guide"
  echo ""
}

# Main deployment flow
main() {
  log_info "Starting secure deployment..."
  
  check_not_root
  create_app_user
  create_backup_user
  install_dependencies
  setup_postgresql
  setup_app_directory
  clone_repository
  build_application
  create_env_file
  set_permissions
  setup_pm2
  setup_firewall
  setup_fail2ban
  create_backup_script
  print_summary
  
  log_success "Deployment complete!"
}

# Run main function
main
