# Database Configuration Guide

Comprehensive guide to database setup and migration for the ThinkMTB Order System.

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [SQLite Setup](#sqlite-setup)
3. [PostgreSQL Setup](#postgresql-setup)
4. [Migration from SQLite to PostgreSQL](#migration-from-sqlite-to-postgresql)
5. [Database Schema](#database-schema)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

---

## Database Architecture

### Overview

The ThinkMTB Order System uses a relational database with the following key entities:

- **Orders & Order Items** - Team member orders and individual line items
- **Products & Designs** - Available items and visual designs
- **Pricing** - Dynamic pricing tiers based on quantity
- **Users** - Team member profiles and admin sessions
- **Payments** - Payment tracking and reconciliation
- **Archives** - Historical campaign snapshots
- **Settings** - Application configuration
- **Email Settings** - SMTP configuration for notifications

### Supported Databases

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **Best For** | Development, small deployments | Production, high-traffic, scaling |
| **Concurrent Connections** | Limited | Many |
| **File Size Limit** | 281TB* | Unlimited |
| **Backups** | File copy | SQL dumps |
| **Replication** | No | Yes |
| **Setup Complexity** | 0 min | 5-10 min |
| **Cost** | Free | Free (self-hosted) |

*Practical limit much lower

---

## SQLite Setup

### Default Configuration

SQLite is the default database and requires **no external installation**.

### Automatic Initialization

The application automatically creates all required tables on first startup:

```bash
npm start
# Database created at: ./data/orders.db
```

### Manual Testing

```bash
# List all tables
sqlite3 data/orders.db ".tables"

# View schema
sqlite3 data/orders.db ".schema orders"

# Run a query
sqlite3 data/orders.db "SELECT COUNT(*) FROM orders;"

# Export data
sqlite3 data/orders.db ".mode csv" ".output dump.csv" "SELECT * FROM orders;"

# Open interactive shell
sqlite3 data/orders.db
sqlite> .help
sqlite> SELECT * FROM app_settings;
sqlite> .quit
```

### WAL Mode

The application uses SQLite's Write-Ahead Logging (WAL) mode for better concurrency:

```bash
# Verify WAL is enabled
sqlite3 data/orders.db "PRAGMA journal_mode;"
# Output: wal

# Force WAL mode (if needed)
sqlite3 data/orders.db "PRAGMA journal_mode=WAL;"
```

### Performance Optimization

```bash
# Enable query optimization
sqlite3 data/orders.db "PRAGMA optimize;"

# Analyze tables for query planner
sqlite3 data/orders.db "ANALYZE;"

# Optimize database file
sqlite3 data/orders.db "VACUUM;"
```

### SQLite Limitations

For deployment consideration:
- **Concurrent writes**: Limited (database locks)
- **Max connections**: ~1-2 concurrent writers recommended
- **Backup strategy**: Simple file copy to another location
- **Scaling**: Switch to PostgreSQL if traffic increases

---

## PostgreSQL Setup

### Installation (Ubuntu/Debian)

```bash
# Update packages
sudo apt update

# Install PostgreSQL 13+
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Initial Configuration

```bash
# Connect as postgres user
sudo -u postgres psql

# Create database user
CREATE USER thinkmtb WITH PASSWORD 'your_secure_password';

# Create database
CREATE DATABASE thinkmtb_order OWNER thinkmtb;

# Grant privileges
ALTER ROLE thinkmtb CREATEDB;
GRANT CONNECT ON DATABASE thinkmtb_order TO thinkmtb;

# Connect to new database and grant schema privileges
\connect thinkmtb_order
GRANT USAGE ON SCHEMA public TO thinkmtb;
GRANT CREATE ON SCHEMA public TO thinkmtb;
ALTER SCHEMA public OWNER TO thinkmtb;

# Exit
\q
```

### Connection Testing

```bash
# Test connection as thinkmtb user
psql -U thinkmtb -d thinkmtb_order -h localhost

# If successful, you'll see:
# thinkmtb_order=>

# Check connection parameters
# From app:
psql -d "postgresql://thinkmtb:password@localhost:5432/thinkmtb_order"
```

### Application Configuration

Edit `.env.local`:

```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://thinkmtb:your_secure_password@localhost:5432/thinkmtb_order
```

Or with different host (e.g., cloud database):

```env
DATABASE_URL=postgresql://thinkmtb:password@db.example.com:5432/thinkmtb_order?sslmode=require
```

### Initialization Script

The application will automatically create all required tables on first connection. To manually initialize:

```bash
# Start app once to create tables
npm start

# Verify tables created
psql -U thinkmtb -d thinkmtb_order -c "\dt"
```

### Remote Database Connection

For cloud deployments (AWS RDS, DigitalOcean, etc.):

```env
# With SSL required
DATABASE_URL=postgresql://username:password@host:5432/dbname?sslmode=require

# Options for sslmode:
# disable  - No SSL
# allow    - Try non-SSL first, then SSL
# prefer   - Try SSL first, then non-SSL
# require  - Only SSL (recommended for production)
# verify-ca - SSL with CA certificate verification
# verify-full - SSL with full verification
```

---

## Migration from SQLite to PostgreSQL

### Pre-Migration Checklist

- [ ] PostgreSQL server installed and running
- [ ] Database and user created
- [ ] PostgreSQL connection tested
- [ ] Current SQLite database backed up
- [ ] Zero downtime maintenance window scheduled
- [ ] Team notified of migration

### Step-by-Step Migration

#### Method 1: Using Migration Script (Recommended)

**Create migration script** (`scripts/migrate-to-postgresql.sh`):

```bash
#!/bin/bash
set -e

SQLITE_DB="data/orders.db"
PG_CONNECTION="postgresql://thinkmtb:password@localhost:5432/thinkmtb_order"

# 1. Export SQLite data as SQL
echo "Exporting SQLite data..."
sqlite3 "$SQLITE_DB" ".mode insert" > /tmp/sqlite_data.sql

# 2. Backup SQLite
echo "Backing up SQLite..."
cp "$SQLITE_DB" "$SQLITE_DB.backup.pre-migration"

# 3. Create tables in PostgreSQL (app does this automatically)
echo "Creating PostgreSQL schema..."
npm start &
sleep 10
kill %1

# 4. Export SQLite to CSV and import to PostgreSQL
echo "Migrating data..."
sqlite3 "$SQLITE_DB" -csv "SELECT * FROM orders" | psql "$PG_CONNECTION" \
  -c "COPY orders(id, user_name, status, notes, created_at, updated_at) FROM STDIN CSV"

# Similar for other tables...

echo "Migration complete!"
```

#### Method 2: Manual CSV Export/Import

```bash
# 1. Backup SQLite
cp data/orders.db data/orders.db.backup.pre-migration

# 2. Export each table from SQLite
sqlite3 data/orders.db -csv "SELECT * FROM designs" > /tmp/designs.csv
sqlite3 data/orders.db -csv "SELECT * FROM product_types" > /tmp/product_types.csv
sqlite3 data/orders.db -csv "SELECT * FROM orders" > /tmp/orders.csv
sqlite3 data/orders.db -csv "SELECT * FROM order_items" > /tmp/order_items.csv
sqlite3 data/orders.db -csv "SELECT * FROM users" > /tmp/users.csv
sqlite3 data/orders.db -csv "SELECT * FROM payments" > /tmp/payments.csv
sqlite3 data/orders.db -csv "SELECT * FROM admin_sessions" > /tmp/admin_sessions.csv
sqlite3 data/orders.db -csv "SELECT * FROM archived_campaigns" > /tmp/archived_campaigns.csv
sqlite3 data/orders.db -csv "SELECT * FROM app_settings" > /tmp/app_settings.csv
sqlite3 data/orders.db -csv "SELECT * FROM pricing_tiers" > /tmp/pricing_tiers.csv

# 3. Stop application
pm2 stop thinkmtb-order

# 4. Update .env.local to use PostgreSQL
nano .env.local
# Set: DATABASE_TYPE=postgresql
# Set: DATABASE_URL=postgresql://...

# 5. Start application (creates schema)
npm start &
sleep 10
kill %1

# 6. Import data into PostgreSQL (example for orders)
psql -U thinkmtb -d thinkmtb_order -c "\COPY orders FROM '/tmp/orders.csv' CSV HEADER"
psql -U thinkmtb -d thinkmtb_order -c "\COPY designs FROM '/tmp/designs.csv' CSV HEADER"
psql -U thinkmtb -d thinkmtb_order -c "\COPY product_types FROM '/tmp/product_types.csv' CSV HEADER"
# ... repeat for all tables

# 7. Restart application
npm run build
pm2 restart thinkmtb-order

# 8. Verify
curl http://localhost:3000/api/catalog
```

#### Method 3: SQL Dump (Intermediate Format)

```bash
# 1. Export SQLite as SQL
sqlite3 data/orders.db ".dump" > /tmp/sqlite_dump.sql

# 2. Backup SQLite
cp data/orders.db data/orders.db.backup.pre-migration

# 3. Convert SQLite SQL to PostgreSQL syntax (manual review needed)
# Common conversions:
# - Replace AUTOINCREMENT with SERIAL
# - Replace INTEGER PRIMARY KEY with BIGSERIAL
# - Replace TEXT with VARCHAR
# - Remove SQLite-specific pragmas

nano /tmp/sqlite_dump.sql  # Review and edit

# 4. Apply to PostgreSQL
psql -U thinkmtb -d thinkmtb_order < /tmp/sqlite_dump.sql

# 5. Verify
psql -U thinkmtb -d thinkmtb_order -c "SELECT COUNT(*) FROM orders;"
```

### Post-Migration Verification

```bash
# Compare record counts
echo "SQLite:"
sqlite3 data/orders.db "SELECT 'orders', COUNT(*) FROM orders
                        UNION SELECT 'order_items', COUNT(*) FROM order_items
                        UNION SELECT 'designs', COUNT(*) FROM designs
                        UNION SELECT 'product_types', COUNT(*) FROM product_types"

echo ""
echo "PostgreSQL:"
psql -U thinkmtb -d thinkmtb_order -c \
  "SELECT 'orders' as table_name, COUNT(*) FROM orders
   UNION SELECT 'order_items', COUNT(*) FROM order_items
   UNION SELECT 'designs', COUNT(*) FROM designs
   UNION SELECT 'product_types', COUNT(*) FROM product_types"

# Test application
curl http://localhost:3000/api/catalog
curl http://localhost:3000/api/orders

# Check application logs
pm2 logs thinkmtb-order
```

### Rollback Procedure

If migration fails, rollback is simple:

```bash
# 1. Stop application
pm2 stop thinkmtb-order

# 2. Restore .env.local to SQLite
nano .env.local
# Set: DATABASE_TYPE=sqlite
# Set: DATABASE_URL=sqlite:./data/orders.db

# 3. Restore SQLite from backup
cp data/orders.db.backup.pre-migration data/orders.db

# 4. Restart application
npm start

# 5. Verify
pm2 logs thinkmtb-order
```

---

## Database Schema

### Core Tables

#### designs
```sql
CREATE TABLE designs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  designed_for TEXT,  -- e.g., "jerseys,bibs"
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### product_types
```sql
CREATE TABLE product_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- jersey, bib, vest, etc.
  example_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  fit_options TEXT NOT NULL DEFAULT '["unisex"]',  -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### pricing_tiers
```sql
CREATE TABLE pricing_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_type_id TEXT NOT NULL,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL,
  price_crc REAL NOT NULL,
  price_usd REAL NOT NULL,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id)
);
CREATE INDEX idx_pricing_product_qty ON pricing_tiers(product_type_id, min_qty);
```

#### orders
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### order_items
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_type_id TEXT NOT NULL,
  design_id TEXT NOT NULL,
  size_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  sleeve_length TEXT,  -- for enduro jerseys
  fit TEXT,             -- unisex, womens, etc.
  unit_price_crc REAL,
  unit_price_usd REAL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id),
  FOREIGN KEY (design_id) REFERENCES designs(id),
  FOREIGN KEY (size_id) REFERENCES sizes(id)
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### admin_sessions
```sql
CREATE TABLE admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours'))
);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
```

#### archived_campaigns
```sql
CREATE TABLE archived_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_name TEXT NOT NULL,
  campaign_number INTEGER NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now')),
  orders_snapshot TEXT NOT NULL,        -- JSON array of orders
  summary_snapshot TEXT NOT NULL,       -- JSON summary
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_revenue_usd REAL NOT NULL DEFAULT 0,
  delete_at TEXT NOT NULL,              -- auto-delete timestamp
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_archived_campaigns_delete_at ON archived_campaigns(delete_at);
```

#### app_settings
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings:
-- ordering_active: '0' or '1'
-- admin_password: hashed or plain
-- club_name: 'ThinkMTB'
-- archive_retention_days: '365'
-- session_timeout_minutes: '15'
-- payment_zelle, payment_venmo, payment_paypal, payment_cash
```

---

## Backup & Recovery

### SQLite Backups

```bash
# Manual backup
cp data/orders.db data/orders.db.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup integrity
sqlite3 data/orders.db.backup.20240115_120000 ".tables"

# Restore from backup
cp data/orders.db.backup.20240115_120000 data/orders.db

# Create compressed backup
gzip -c data/orders.db > data/orders.db.backup.$(date +%Y%m%d_%H%M%S).gz

# List backups
ls -lh data/orders.db.backup*
```

### PostgreSQL Backups

```bash
# Backup single database
pg_dump -U thinkmtb -d thinkmtb_order > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup (recommended)
pg_dump -U thinkmtb -d thinkmtb_order | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup with inserts (easier restore)
pg_dump -U thinkmtb -d thinkmtb_order --inserts > backup.sql

# Custom format (faster for large databases)
pg_dump -U thinkmtb -d thinkmtb_order -Fc > backup.dump

# Backup all databases
pg_dumpall -U postgres | gzip > all_databases_$(date +%Y%m%d).sql.gz

# Restore from backup
psql -U thinkmtb -d thinkmtb_order < backup.sql

# Restore from compressed
gunzip -c backup_20240115.sql.gz | psql -U thinkmtb -d thinkmtb_order

# Restore from custom format
pg_restore -U thinkmtb -d thinkmtb_order backup.dump
```

### Automated Backups

Create `/etc/cron.daily/thinkmtb-backup`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/thinkmtb"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# For SQLite
cp /opt/thinkmtb-order/data/orders.db \
   $BACKUP_DIR/orders.db.backup.$(date +\%Y\%m\%d_%H\%M\%S)

# For PostgreSQL
pg_dump -U thinkmtb -d thinkmtb_order | gzip \
  > $BACKUP_DIR/thinkmtb_order_$(date +\%Y\%m\%d_%H\%M\%S).sql.gz

# Clean old backups
find $BACKUP_DIR -name "*.backup*" -o -name "*.sql.gz" | \
  xargs -I {} find {} -mtime +$RETENTION_DAYS -delete

# Log rotation
echo "Backup completed: $(date)" >> /var/log/thinkmtb-backup.log
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/thinkmtb-backup
```

---

## Performance Tuning

### SQLite

```bash
# Enable WAL (improves concurrency)
sqlite3 data/orders.db "PRAGMA journal_mode=WAL;"

# Increase cache size (more RAM = faster queries)
sqlite3 data/orders.db "PRAGMA cache_size=10000;"

# Enable query optimization
sqlite3 data/orders.db "PRAGMA optimize;"

# Create indexes for common queries
sqlite3 data/orders.db "CREATE INDEX IF NOT EXISTS 
  idx_orders_user ON orders(user_name);"
```

### PostgreSQL

```bash
# Connect as postgres and edit postgresql.conf
sudo -u postgres psql -d template1 -c \
  "ALTER SYSTEM SET max_connections = 100;"

# Reload configuration
sudo systemctl reload postgresql

# Check configuration
psql -U postgres -d template1 -c "SHOW all;" | grep max_connections

# Create indexes
psql -U thinkmtb -d thinkmtb_order -c \
  "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_name);"

# Analyze tables for query planning
psql -U thinkmtb -d thinkmtb_order -c "ANALYZE;"
```

---

## Troubleshooting

### SQLite Issues

**"Database is locked"**
```bash
# Check for processes holding lock
lsof data/orders.db

# Restart application
pm2 restart thinkmtb-order

# Check WAL files
ls -la data/orders.db*

# If stuck, remove WAL files (caution!)
rm data/orders.db-wal data/orders.db-shm
```

**"Corrupted database"**
```bash
# Check integrity
sqlite3 data/orders.db "PRAGMA integrity_check;"

# Attempt recovery
sqlite3 data/orders.db ".recover" > recovered.sql

# Restore from backup
cp data/orders.db.backup.* data/orders.db
```

### PostgreSQL Issues

**"FATAL: Peer authentication failed"**
```bash
# Edit /etc/postgresql/13/main/pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Find line with "peer" and change to "md5"
# local   all             all                                     md5

# Reload configuration
sudo systemctl reload postgresql
```

**"Connection refused"**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check port is listening
sudo lsof -i :5432

# Check in pg_hba.conf that localhost is configured
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Ensure: host    all             all             127.0.0.1/32            md5
```

**"Disk space full"**
```bash
# Check disk usage
df -h

# Vacuum database
psql -U thinkmtb -d thinkmtb_order -c "VACUUM FULL;"

# Analyze
psql -U thinkmtb -d thinkmtb_order -c "ANALYZE;"
```

### Application Connection Issues

**"Cannot connect to database"**
```bash
# Test connection manually
# For SQLite:
sqlite3 data/orders.db ".tables"

# For PostgreSQL:
psql -U thinkmtb -d thinkmtb_order -c "SELECT 1;"

# Check .env.local
cat .env.local | grep DATABASE

# View application logs
pm2 logs thinkmtb-order | grep -i database
```

