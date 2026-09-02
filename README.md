# ThinkMTB Order Management System

A comprehensive, self-hosted team order management system built with Next.js, TypeScript, and Tailwind CSS. Designed for sports teams and clubs to manage product orders, track pricing, and process payments.

**Live Demo**: [thinkmtb.moralesrodionoff.com](https://thinkmtb.moralesrodionoff.com)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Deployment Guide](#deployment-guide)
- [Database Options](#database-options)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## Features

### Core Functionality
- **Team Order Management** - Create, track, and manage team orders for multiple products
- **Dynamic Pricing** - Automatic price calculation based on quantity tiers
- **Design Management** - Upload and select from multiple design options
- **Size & Fit Options** - Product variants with sleeve length, fit type, and sizes
- **Payment Tracking** - Track payments across multiple methods (Zelle, Venmo, PayPal, Cash)
- **Admin Dashboard** - Comprehensive admin panel for order management and configuration
- **Campaign Management** - Archive campaigns for historical reference with configurable retention

### User Features
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Real-time Pricing** - See current prices based on order tier and team quantities
- **Order Form** - Multi-step order form with design preview
- **Password Protection** - Secure access to order forms
- **Currency Support** - Display pricing in USD and CRC with live exchange rates
- **Session Management** - Configurable auto-logout with idle detection

### Admin Features
- **Settings Management** - Configure session timeout, archive retention, payment methods
- **Campaign Control** - Start new campaigns, archive old data
- **Product Management** - Create products and pricing tiers
- **Design Upload** - Add new designs with image validation
- **Team Management** - View team totals and order summaries
- **Email Configuration** - Setup SMTP for notifications
- **Archive Viewer** - Browse and analyze historical campaign data

---

## Tech Stack

### Frontend
- **Next.js 16.1.6** - React framework with SSR and API routes
- **React 19.2.3** - UI component library
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **React Hooks** - Custom hooks for state management

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **Node.js 18+** - JavaScript runtime
- **better-sqlite3** - SQLite driver (default)
- **PostgreSQL** - Optional high-performance database
- **Nodemailer** - Email sending for notifications

### DevOps
- **PM2** - Process manager for production
- **Nginx** - Reverse proxy and web server
- **Let's Encrypt** - SSL/TLS certificates

---

## Quick Start

### Prerequisites
- **Node.js 18.x** or later
- **npm 9.x** or later
- **Git 2.25+**
- **Build tools** (gcc, python3 - for better-sqlite3)

### Local Development

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

**Initial Setup:**
- Login to `/admin` with the password you set in configuration
- Change admin password in Settings on first login

### Production Deployment (Automated)

#### Option 1: SQLite (Simple, Single-Server)

```bash
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order
chmod +x scripts/deploy.sh
./scripts/deploy.sh --domain yourdomain.com
```

#### Option 2: PostgreSQL (Scalable, High-Traffic)

```bash
git clone https://github.com/allen506/thinkmtb-order.git
cd thinkmtb-order
chmod +x scripts/deploy-postgresql.sh
./scripts/deploy-postgresql.sh --domain yourdomain.com
```

---

## Deployment Guide

### Complete Deployment Documentation

See [**DEPLOYMENT.md**](./DEPLOYMENT.md) for comprehensive deployment guide including:
- System requirements
- Detailed step-by-step installation
- Production configuration
- Nginx setup with SSL
- Monitoring and maintenance
- Troubleshooting common issues
- Performance optimization

### Database Configuration

See [**DATABASE.md**](./DATABASE.md) for:
- SQLite vs PostgreSQL comparison
- Database initialization
- SQLite to PostgreSQL migration
- Backup and recovery procedures
- Performance tuning
- Database schema documentation

---

## Database Options

### SQLite (Default)

**Best for**: Small to medium deployments, single server, low traffic

```bash
# Already configured - just run
npm start
# Database created at: ./data/orders.db
```

### PostgreSQL (Recommended for Production)

**Best for**: Production, high-traffic, multi-server deployments

```bash
# Using deployment script (automated setup)
./scripts/deploy-postgresql.sh

# Or configure manually
DATABASE_URL=postgresql://user:pass@host:5432/dbname npm start
```

---

## Project Structure

```
thinkmtb-order/
├── src/app/
│   ├── api/                    # API Route handlers
│   ├── admin/                  # Admin pages
│   ├── user/                   # User pages
│   └── designs/                # Design gallery
├── src/components/             # React components
├── src/lib/                    # Utilities
├── public/                     # Static assets
├── scripts/                    # Deployment scripts
├── DEPLOYMENT.md               # Deployment guide
├── DATABASE.md                 # Database docs
└── README.md                   # This file
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local`:

```env
NODE_ENV=production
PORT=3000
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:./data/orders.db
ADMIN_PASSWORD=YourSecurePassword
SESSION_TIMEOUT_MINUTES=15
```

See [`.env.example`](./.env.example) for complete options.

---

## Development

```bash
npm install
npm run dev      # runs on http://localhost:3000
npm run build    # build for production
npm start        # start production server
npm run lint     # check code quality
```

---

## API Documentation

### Public Endpoints

- `GET /api/catalog` - Get products and designs
- `GET /api/exchange-rate` - Get USD/CRC rate
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details

### Admin Endpoints (Protected)

- `GET /api/app-settings` - Get settings
- `PATCH /api/app-settings` - Update settings
- `GET /api/archived-campaigns` - View archives
- `POST /api/orders/new-campaign` - Start new campaign

---

## Production Management

### Using PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Common commands
pm2 logs thinkmtb-order      # View logs
pm2 restart thinkmtb-order   # Restart app
pm2 status                    # Check status
pm2 monit                     # Monitor resources
```

### Using Nginx

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/thinkmtb-access.log
```

---

## Troubleshooting

### Application Won't Start
```bash
node --version      # Check Node.js v18+
lsof -i :3000       # Check for port conflicts
pm2 logs thinkmtb-order  # View error logs
```

### Database Issues
```bash
# SQLite
sqlite3 data/orders.db ".tables"

# PostgreSQL
psql -U thinkmtb -d thinkmtb_order -c "SELECT 1;"
```

See [**DEPLOYMENT.md**](./DEPLOYMENT.md#troubleshooting) and [**DATABASE.md**](./DATABASE.md#troubleshooting) for detailed troubleshooting.

---

## Support & Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[DATABASE.md](./DATABASE.md)** - Database setup and migration
- **.env.example** - Configuration template

### Backup Database

```bash
# SQLite
cp data/orders.db data/orders.db.backup.$(date +%Y%m%d)

# PostgreSQL
pg_dump -U thinkmtb -d thinkmtb_order > backup_$(date +%Y%m%d).sql
```

### Update Application

```bash
git pull origin main
npm install
npm run build
pm2 restart thinkmtb-order
```

---

## License

[Your License Here]

---

## Contributing

Contributions are welcome! Please follow standard GitHub flow.

---

## Contact & Support

- GitHub Issues: [Create an Issue](https://github.com/allen506/thinkmtb-order/issues)
- Documentation: See DEPLOYMENT.md and DATABASE.md
