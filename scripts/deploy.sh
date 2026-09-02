#!/bin/bash

##############################################################################
# ThinkMTB Order System - Automated Deployment Script (SQLite)
# 
# Usage: ./deploy.sh [--prod] [--domain yourdomain.com]
# 
# Features:
# - Installs Node.js and build dependencies
# - Sets up database (SQLite)
# - Builds and starts application
# - Configures PM2 for auto-restart
# - (Optional) Sets up Nginx reverse proxy
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROD_MODE=false
DOMAIN=""
NGINX_SETUP=false
APP_DIR=$(pwd)
NODE_PORT=3000

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      PROD_MODE=true
      shift
      ;;
    --domain)
      DOMAIN="$2"
      NGINX_SETUP=true
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

# Check if running as root
check_root() {
  if [[ $EUID -eq 0 ]]; then
    log_error "This script should NOT be run as root. Please run as a regular user."
    exit 1
  fi
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command -v git &> /dev/null; then
    log_error "Git is not installed. Please install it first: sudo apt install -y git"
    exit 1
  fi
  
  log_success "Git found"
}

# Install system dependencies
install_dependencies() {
  log_info "Installing system dependencies..."
  
  # Update package lists
  log_info "Updating package lists..."
  sudo apt update -qq
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &>/dev/null
    sudo apt install -y nodejs &>/dev/null
  else
    NODE_VERSION=$(node --version)
    log_success "Node.js already installed: $NODE_VERSION"
  fi
  
  # Install build tools (required for better-sqlite3)
  if ! command -v gcc &> /dev/null; then
    log_info "Installing build tools..."
    sudo apt install -y build-essential python3 &>/dev/null
  else
    log_success "Build tools already installed"
  fi
  
  log_success "System dependencies installed"
}

# Install Node.js dependencies
install_npm_dependencies() {
  log_info "Installing Node.js dependencies..."
  
  if [ ! -d "node_modules" ]; then
    npm install --silent
    log_success "NPM dependencies installed"
  else
    log_info "node_modules already exists. Skipping npm install."
    log_info "Run 'npm install' manually if you need to update dependencies."
  fi
}

# Setup environment file
setup_environment() {
  log_info "Setting up environment configuration..."
  
  if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
      cp .env.example .env.local
      log_success ".env.local created from .env.example"
      
      log_warning "Please edit .env.local with your configuration:"
      log_warning "  nano .env.local"
      log_warning ""
      log_warning "Important variables to update:"
      log_warning "  - APP_URL: Your public domain (if applicable)"
      log_warning "  - ADMIN_PASSWORD: Secure password for admin access"
      log_warning "  - SMTP_*: Email configuration for notifications"
      log_warning "  - PAYMENT_*: Payment method details"
    else
      log_error ".env.example not found. Cannot create .env.local"
      exit 1
    fi
  else
    log_success ".env.local already exists"
  fi
}

# Build application
build_application() {
  log_info "Building Next.js application..."
  
  npm run build
  
  if [ -d ".next" ]; then
    log_success "Application built successfully"
  else
    log_error "Build failed - .next directory not created"
    exit 1
  fi
}

# Install PM2 globally
install_pm2() {
  log_info "Setting up PM2 process manager..."
  
  if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2 globally..."
    sudo npm install -g pm2 &>/dev/null
    
    log_info "Configuring PM2 startup..."
    pm2 startup systemd -u $USER --hp $HOME --no-save &>/dev/null || true
    log_success "PM2 startup configuration completed"
  else
    log_success "PM2 already installed"
  fi
}

# Start application with PM2
start_with_pm2() {
  log_info "Starting application with PM2..."
  
  # Stop existing process if running
  pm2 delete thinkmtb-order &>/dev/null || true
  
  # Start application
  pm2 start ecosystem.config.js --env production &>/dev/null
  
  # Save PM2 config
  pm2 save &>/dev/null
  
  # Enable startup
  pm2 startup systemd -u $USER --hp $HOME &>/dev/null || true
  
  log_success "Application started with PM2"
  
  # Wait for app to start
  sleep 2
  
  # Check status
  if pm2 list | grep -q "thinkmtb-order"; then
    if pm2 list | grep "thinkmtb-order" | grep -q "online"; then
      log_success "Application is running and online"
    else
      log_warning "Application started but status unclear. Check: pm2 logs thinkmtb-order"
    fi
  else
    log_error "Failed to start application with PM2"
    exit 1
  fi
}

# Setup Nginx reverse proxy
setup_nginx() {
  if [ -z "$DOMAIN" ]; then
    return
  fi
  
  log_info "Setting up Nginx reverse proxy for $DOMAIN..."
  
  if ! command -v nginx &> /dev/null; then
    log_info "Installing Nginx..."
    sudo apt install -y nginx &>/dev/null
  fi
  
  # Create Nginx config
  NGINX_CONFIG="/tmp/thinkmtb-nginx.conf"
  cat > "$NGINX_CONFIG" << EOF
upstream thinkmtb_backend {
    server localhost:$NODE_PORT;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://thinkmtb_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://thinkmtb_backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
  
  # Copy to Nginx sites-available
  sudo cp "$NGINX_CONFIG" "/etc/nginx/sites-available/thinkmtb-order"
  
  # Enable site
  sudo ln -sf "/etc/nginx/sites-available/thinkmtb-order" "/etc/nginx/sites-enabled/" 2>/dev/null || true
  
  # Remove default site
  sudo rm -f /etc/nginx/sites-enabled/default
  
  # Test configuration
  if sudo nginx -t &>/dev/null; then
    sudo systemctl restart nginx
    log_success "Nginx configured and restarted"
    
    log_warning "Note: To enable HTTPS, run:"
    log_warning "  sudo apt install -y certbot python3-certbot-nginx"
    log_warning "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  else
    log_error "Nginx configuration test failed"
    exit 1
  fi
}

# Test application
test_application() {
  log_info "Testing application..."
  
  # Wait for application to be ready
  for i in {1..10}; do
    if curl -s http://localhost:$NODE_PORT &>/dev/null; then
      log_success "Application responding on port $NODE_PORT"
      return 0
    fi
    
    if [ $i -lt 10 ]; then
      sleep 1
    fi
  done
  
  log_warning "Application did not respond within 10 seconds"
  log_warning "Check logs: pm2 logs thinkmtb-order"
}

# Display summary
show_summary() {
  echo ""
  log_success "═══════════════════════════════════════════════════════════════"
  log_success "ThinkMTB Order System - Deployment Complete!"
  log_success "═══════════════════════════════════════════════════════════════"
  echo ""
  
  if [ "$PROD_MODE" = true ]; then
    log_info "Mode: PRODUCTION"
  else
    log_info "Mode: DEVELOPMENT"
  fi
  
  echo ""
  log_info "Application URL:"
  if [ -z "$DOMAIN" ]; then
    log_info "  Local: http://localhost:$NODE_PORT"
  else
    log_info "  Public: http://$DOMAIN"
    log_info "  Local: http://localhost:$NODE_PORT"
  fi
  
  echo ""
  log_info "Management Commands:"
  echo "  View logs:           pm2 logs thinkmtb-order"
  echo "  Restart:             pm2 restart thinkmtb-order"
  echo "  Stop:                pm2 stop thinkmtb-order"
  echo "  Status:              pm2 status"
  echo "  Monitor:             pm2 monit"
  
  echo ""
  log_info "Database:"
  echo "  Location: $APP_DIR/data/orders.db"
  echo "  Type: SQLite"
  
  echo ""
  log_info "Configuration:"
  echo "  Environment: $APP_DIR/.env.local"
  echo "  PM2 Config: $APP_DIR/ecosystem.config.js"
  
  if [ ! -z "$DOMAIN" ]; then
    echo ""
    log_info "Nginx:"
    echo "  Config: /etc/nginx/sites-available/thinkmtb-order"
    echo "  Enable HTTPS: sudo certbot --nginx -d $DOMAIN"
  fi
  
  echo ""
  log_warning "Next Steps:"
  echo "  1. Edit .env.local with your configuration"
  echo "  2. Review and set admin password in app_settings"
  echo "  3. Configure payment methods in admin panel"
  echo "  4. Upload product designs and images"
  echo "  5. Set pricing tiers for products"
  
  if [ ! -z "$DOMAIN" ]; then
    echo "  6. Setup SSL certificate: sudo certbot --nginx -d $DOMAIN"
  fi
  
  echo ""
  log_info "For detailed documentation, see:"
  echo "  - DEPLOYMENT.md (deployment guide)"
  echo "  - DATABASE.md (database configuration)"
  echo "  - README.md (project overview)"
  echo ""
}

# Main execution
main() {
  echo -e "${BLUE}"
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║   ThinkMTB Order System - Automated Deployment Script         ║"
  echo "║                                                               ║"
  echo "║   Database: SQLite                                            ║"
  echo "║   Process Manager: PM2                                        ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  
  check_root
  check_prerequisites
  install_dependencies
  install_npm_dependencies
  setup_environment
  build_application
  install_pm2
  start_with_pm2
  test_application
  
  if [ "$NGINX_SETUP" = true ]; then
    setup_nginx
  fi
  
  show_summary
}

# Run main function
main
