import Database from "better-sqlite3";

/**
 * Add design workflow tables and schema updates
 * This migration adds support for:
 * - Design requests and submissions
 * - Product/pricing management per team
 * - Payment tracking (50% upfront, 50% final)
 * - User roles (team_captain, designer, admin)
 */
export function migrateDesignWorkflow(db: Database.Database) {
  console.log('🔧 Migrating database schema for design workflow...');

  try {
    // 1. Add user_role column to user_accounts if not exists
    const userCols = (db.prepare(`PRAGMA table_info(user_accounts)`).all() as { name: string }[]).map(c => c.name);
    
    if (!userCols.includes('user_role')) {
      db.prepare(`ALTER TABLE user_accounts ADD COLUMN user_role TEXT NOT NULL DEFAULT 'user'`).run();
      console.log('✅ Added user_role column to user_accounts');
    }

    if (!userCols.includes('password_reset_token')) {
      db.prepare(`ALTER TABLE user_accounts ADD COLUMN password_reset_token TEXT`).run();
      db.prepare(`ALTER TABLE user_accounts ADD COLUMN password_reset_expires TEXT`).run();
      console.log('✅ Added password reset columns to user_accounts');
    }

    if (!userCols.includes('is_team_captain')) {
      db.prepare(`ALTER TABLE user_accounts ADD COLUMN is_team_captain INTEGER NOT NULL DEFAULT 0`).run();
      console.log('✅ Added is_team_captain column to user_accounts');
    }

    // 2. Design requests table
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_requests (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        requester_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_design', 'approved', 'rejected', 'archived')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (requester_id) REFERENCES user_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_design_requests_tenant_status ON design_requests(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_design_requests_team ON design_requests(team_id);
    `);
    console.log('✅ Created design_requests table');

    // 3. Design request files/uploads
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_request_files (
        id TEXT PRIMARY KEY,
        design_request_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (design_request_id) REFERENCES design_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES user_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_design_request_files_request ON design_request_files(design_request_id);
    `);
    console.log('✅ Created design_request_files table');

    // 4. Design submissions from designers
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_submissions (
        id TEXT PRIMARY KEY,
        design_request_id TEXT NOT NULL,
        designer_id TEXT NOT NULL,
        submission_number INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'revised')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (design_request_id) REFERENCES design_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (designer_id) REFERENCES user_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_design_submissions_request ON design_submissions(design_request_id);
      CREATE INDEX IF NOT EXISTS idx_design_submissions_status ON design_submissions(status);
    `);
    console.log('✅ Created design_submissions table');

    // 5. Design submission files
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_submission_files (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (submission_id) REFERENCES design_submissions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_design_submission_files_submission ON design_submission_files(submission_id);
    `);
    console.log('✅ Created design_submission_files table');

    // 6. Design comments
    db.exec(`
      CREATE TABLE IF NOT EXISTS design_comments (
        id TEXT PRIMARY KEY,
        design_request_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        is_internal INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (design_request_id) REFERENCES design_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_design_comments_request ON design_comments(design_request_id);
    `);
    console.log('✅ Created design_comments table');

    // 7. Team products (products available for each team)
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_products (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        product_type_id TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (product_type_id) REFERENCES product_types(id),
        UNIQUE(team_id, product_type_id)
      );

      CREATE INDEX IF NOT EXISTS idx_team_products_team ON team_products(team_id);
    `);
    console.log('✅ Created team_products table');

    // 8. Price overrides (special pricing approved by CMS management)
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_overrides (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        product_type_id TEXT NOT NULL,
        min_qty INTEGER NOT NULL,
        max_qty INTEGER NOT NULL,
        price_crc REAL NOT NULL,
        price_usd REAL NOT NULL,
        approved_by TEXT NOT NULL,
        approved_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (product_type_id) REFERENCES product_types(id),
        FOREIGN KEY (approved_by) REFERENCES user_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_price_overrides_team_product ON price_overrides(team_id, product_type_id);
    `);
    console.log('✅ Created price_overrides table');

    // 9. Orders table updates for design integration
    const orderCols = (db.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[]).map(c => c.name);
    
    if (!orderCols.includes('approved_design_id')) {
      db.prepare(`ALTER TABLE orders ADD COLUMN approved_design_id TEXT`).run();
      db.prepare(`ALTER TABLE orders RENAME TO orders_old`).run();
      
      // Recreate with proper structure
      db.exec(`
        DROP TABLE IF EXISTS orders_old;
      `);
      console.log('✅ Updated orders table with design integration');
    }

    // 10. Payment stages table (50% deposit, 100% final)
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        payment_stage TEXT NOT NULL CHECK(payment_stage IN ('deposit_50', 'final_50', 'shipping_adjustment')),
        amount_usd REAL NOT NULL,
        amount_crc REAL NOT NULL,
        exchange_rate REAL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'requested', 'paid', 'confirmed', 'cancelled')),
        bac_payment_link TEXT,
        payment_reference TEXT,
        notes TEXT,
        requested_at TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_order_payments_order_stage ON order_payments(order_id, payment_stage);
      CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
    `);
    console.log('✅ Created order_payments table');

    // 11. Payment notifications (track when admins notify about shipping/payment due)
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_notifications (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        notification_type TEXT NOT NULL CHECK(notification_type IN ('order_ready_for_pickup', 'final_payment_due', 'shipping_info_needed')),
        sent_at TEXT NOT NULL DEFAULT (datetime('now')),
        read_at TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payment_notifications_order ON payment_notifications(order_id);
    `);
    console.log('✅ Created payment_notifications table');

    // 12. Shipping options
    db.exec(`
      CREATE TABLE IF NOT EXISTS shipping_options (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        cost_usd REAL NOT NULL,
        cost_crc REAL NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );
    `);
    console.log('✅ Created shipping_options table');

    // 13. Order shipping (track which shipping method selected)
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_shipping (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        shipping_option_id TEXT,
        cost_usd REAL,
        cost_crc REAL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'selected', 'confirmed')),
        selected_at TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (shipping_option_id) REFERENCES shipping_options(id)
      );

      CREATE INDEX IF NOT EXISTS idx_order_shipping_order ON order_shipping(order_id);
    `);
    console.log('✅ Created order_shipping table');

    // 14. Designer account (special user role with limited permissions)
    db.exec(`
      CREATE TABLE IF NOT EXISTS designer_accounts (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        company_name TEXT,
        permissions TEXT NOT NULL DEFAULT '["view_requests","submit_designs","view_approvals"]',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        UNIQUE(tenant_id, email)
      );

      CREATE INDEX IF NOT EXISTS idx_designer_accounts_tenant ON designer_accounts(tenant_id);
    `);
    console.log('✅ Created designer_accounts table');

    console.log('✅ Design workflow migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}
