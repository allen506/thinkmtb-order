import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;
let DB_PATH: string | null = null;
let initAttempted = false;
let buildMode = false;

// Detect if we're in Next.js build by checking if this is being imported during build
if (typeof global !== 'undefined' && (global as any).__NEXT_DATA__?.isPreview === false) {
  buildMode = true;
}

function getDbPath(): string {
  if (!DB_PATH) {
    DB_PATH = path.join(process.cwd(), "data", "orders.db");
  }
  return DB_PATH;
}

// Create a no-op proxy for build time
const noOpDb = new Proxy({} as any, {
  get: () => new Proxy(() => ({ all: () => [], get: () => null, run: () => ({}) }), {
    get: () => new Proxy(() => ({}), { get: () => () => ({}) })
  })
});

export function getDb(): Database.Database {
  // In production/build mode without explicit initialization, return no-op proxy
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_DB_INIT && !db && !initAttempted) {
    return noOpDb;
  }

  if (!db && !initAttempted) {
    initAttempted = true;
    try {
      // Ensure data directory exists
      const fs = require("fs");
      const dbPath = getDbPath();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = new Database(dbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      initializeDb(db);
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      if (buildMode) {
        // Return no-op proxy during build on error
        return noOpDb;
      }
      throw error;
    }
  }
  
  if (!db) {
    return noOpDb;
  }
  
  return db;
}

function initializeDb(db: Database.Database) {
  // Create tenant tables (multi-tenancy support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      admin_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      theme_color TEXT,
      logo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tenant_admins (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'owner')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS tenant_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(tenant_id, key)
    );

    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      tenant_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS product_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      example_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      tenant_id TEXT,
      fit_options TEXT NOT NULL DEFAULT '["unisex"]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_type_id TEXT NOT NULL,
      min_qty INTEGER NOT NULL,
      max_qty INTEGER NOT NULL,
      price_crc REAL NOT NULL,
      price_usd REAL NOT NULL,
      tenant_id TEXT,
      FOREIGN KEY (product_type_id) REFERENCES product_types(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS sizes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      tenant_id TEXT,
      order_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_type_id TEXT NOT NULL,
      design_id TEXT NOT NULL,
      size_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_crc REAL,
      unit_price_usd REAL,
      sleeve_length TEXT,
      fit TEXT,
      tenant_id TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_type_id) REFERENCES product_types(id),
      FOREIGN KEY (design_id) REFERENCES designs(id),
      FOREIGN KEY (size_id) REFERENCES sizes(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crc_to_usd REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_number_seq (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      next_val INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      pin TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      amount_usd REAL,
      amount_crc REAL,
      method TEXT NOT NULL,
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours'))
    );

    CREATE TABLE IF NOT EXISTS smtp_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      secure INTEGER NOT NULL DEFAULT 1,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      from_email TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      UNIQUE(email, tenant_id)
    );

    CREATE TABLE IF NOT EXISTS archived_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_name TEXT NOT NULL,
      campaign_number INTEGER NOT NULL,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      orders_snapshot TEXT NOT NULL,
      summary_snapshot TEXT NOT NULL,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_revenue_usd REAL NOT NULL DEFAULT 0,
      delete_at TEXT NOT NULL,
      tenant_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS passwordless_tokens (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_archived_campaigns_delete_at ON archived_campaigns(delete_at);
  `);

  // Ensure the sequence row exists
  db.prepare(`INSERT OR IGNORE INTO order_number_seq (id, next_val) VALUES (1, 100)`).run();

  // Ensure default settings exist
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ordering_active', '1')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('admin_password', 'thinkmtb123')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('club_name', 'ThinkMTB')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_zelle', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_venmo', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_paypal', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_cash', 'Pay in person at the event or contact an admin.')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('archive_retention_days', '365')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('session_timeout_minutes', '15')`).run();

  // Add sleeve_length column to order_items if it doesn't exist
  const itemCols = (db.prepare(`PRAGMA table_info(order_items)`).all() as { name: string }[]).map(c => c.name);
  if (!itemCols.includes('sleeve_length')) {
    db.prepare(`ALTER TABLE order_items ADD COLUMN sleeve_length TEXT`).run();
  }
  if (!itemCols.includes('fit')) {
    db.prepare(`ALTER TABLE order_items ADD COLUMN fit TEXT`).run();
  }
  // Add fit_options column to product_types if it doesn't exist
  const ptCols = (db.prepare(`PRAGMA table_info(product_types)`).all() as { name: string }[]).map(c => c.name);
  if (!ptCols.includes('fit_options')) {
    db.prepare(`ALTER TABLE product_types ADD COLUMN fit_options TEXT NOT NULL DEFAULT '["unisex"]'`).run();
  }

  // Add designed_for column to designs if it doesn't exist
  const designCols = (db.prepare(`PRAGMA table_info(designs)`).all() as { name: string }[]).map(c => c.name);
  if (!designCols.includes('designed_for')) {
    db.prepare(`ALTER TABLE designs ADD COLUMN designed_for TEXT`).run();
  }

  // Create product_designs table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_type_id TEXT NOT NULL,
      design_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      tenant_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_type_id, design_id, tenant_id),
      FOREIGN KEY (product_type_id) REFERENCES product_types(id),
      FOREIGN KEY (design_id) REFERENCES designs(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
  `);

  // Rename enduro-jersey to "Enduro Long Sleeve" if it still has the old name
  db.prepare(
    `UPDATE product_types SET name = 'Enduro Long Sleeve', description = 'Long Sleeve Jersey'
     WHERE id = 'enduro-jersey' AND name = 'BMX / Enduro / Downhill Jersey'`
  ).run();

  // Add enduro-short product if it doesn't exist
  db.prepare(`
    INSERT OR IGNORE INTO product_types (id, name, description, category, example_url, sort_order)
    VALUES ('enduro-short', 'Enduro Short Sleeve', 'Short Sleeve Dry Fit Jersey', 'jersey',
      'https://www.cmssportswear.com/tshirt-personalizada', 3)
  `).run();
  // Shift wind-vest sort order if needed to make room
  db.prepare(`UPDATE product_types SET sort_order = 4 WHERE id = 'wind-vest' AND sort_order = 3`).run();

  // Add enduro-short pricing tiers if not already present
  const shortTierCount = (db.prepare(
    `SELECT COUNT(*) as count FROM pricing_tiers WHERE product_type_id = 'enduro-short'`
  ).get() as { count: number }).count;
  if (shortTierCount === 0) {
    const insertTier = db.prepare(
      `INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd) VALUES (?, ?, ?, ?, ?)`
    );
    const shortTiers = [
      [1, 1, 24000, 48.48],
      [2, 5, 22000, 44.44],
      [6, 10, 21000, 42.42],
      [11, 20, 20000, 40.40],
      [21, 30, 18000, 36.36],
      [31, 50, 16000, 32.32],
      [51, 100, 14000, 28.28],
    ];
    for (const t of shortTiers) {
      insertTier.run('enduro-short', t[0], t[1], t[2], t[3]);
    }
  }

  // Add order_number column if it was not part of the original schema
  const cols = (db.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('order_number')) {
    db.prepare(`ALTER TABLE orders ADD COLUMN order_number TEXT`).run();
    // Backfill existing orders in created_at order
    const existing = db.prepare(`SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at ASC`).all() as { id: string }[];
    const seq = db.prepare(`SELECT next_val FROM order_number_seq WHERE id = 1`).get() as { next_val: number };
    let n = seq.next_val;
    const update = db.prepare(`UPDATE orders SET order_number = ? WHERE id = ?`);
    const bumpSeq = db.prepare(`UPDATE order_number_seq SET next_val = ? WHERE id = 1`);
    db.transaction(() => {
      for (const row of existing) {
        update.run(`thnk-${n}`, row.id);
        n++;
      }
      bumpSeq.run(n);
    })();
  }

  // Add final_designs table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS final_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed initial data if tables are empty
  const designCount = db.prepare("SELECT COUNT(*) as count FROM designs").get() as { count: number };
  if (designCount.count === 0) {
    seedData(db);
  }

  // Multi-tenancy migration: Create default tenant if none exists (backward compatibility)
  const tenantCount = db.prepare("SELECT COUNT(*) as count FROM tenants").get() as { count: number };
  if (tenantCount.count === 0) {
    const defaultTenantId = 'tenant_default';
    db.prepare(`
      INSERT INTO tenants (id, name, slug, admin_email, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(defaultTenantId, 'Default Tenant', 'default', 'admin@default.local', 'active');

    // Initialize default tenant settings from app_settings
    const appSettings = db.prepare("SELECT key, value FROM app_settings").all() as { key: string; value: string }[];
    const insertSetting = db.prepare(`
      INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    for (const setting of appSettings) {
      insertSetting.run(defaultTenantId, setting.key, setting.value);
    }

    // Migrate existing data to default tenant
    db.prepare(`UPDATE designs SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE product_types SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE pricing_tiers SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE orders SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE order_items SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE archived_campaigns SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
    db.prepare(`UPDATE product_designs SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
  }

  // Ensure default settings in app_settings for backward compatibility
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ordering_active', '1')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('admin_password', 'ChangeThisToYourSecurePassword')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('club_name', 'ThinkMTB')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('team_password', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_zelle', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_venmo', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_paypal', '')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('payment_cash', 'Pay in person at the event or contact an admin.')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('archive_retention_days', '365')`).run();
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('session_timeout_minutes', '15')`).run();
}

function seedData(db: Database.Database) {
  // Insert designs
  const insertDesign = db.prepare(
    "INSERT INTO designs (id, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)"
  );
  const designs = [
    ["design-1", "Traditional Black", "Classic black ThinkMTB team design", "/designs/design1.jpg", 1],
    ["design-2", "Traditional White", "Classic white ThinkMTB team design", "/designs/design2.jpg", 2],
    ["design-3", "Race Green", "Green race ThinkMTB team design", "/designs/design3.jpg", 3],
    ["design-4", "Race Purple", "Purple race ThinkMTB team design", "/designs/design4.jpg", 4],
  ];
  for (const d of designs) {
    insertDesign.run(...d);
  }

  // Insert product types
  const insertProduct = db.prepare(
    "INSERT INTO product_types (id, name, description, category, example_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const products = [
    ["pro-jersey", "CMS PRO LINE Cycling Jersey", "Jersey Only - Pro line", "jersey", "https://www.cmssportswear.com/linea-pro-personalizados", 1],
    ["enduro-jersey", "Enduro Long Sleeve", "Long Sleeve Jersey", "jersey", "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado", 2],
    ["enduro-short", "Enduro Short Sleeve", "Short Sleeve Dry Fit Jersey", "jersey", "https://www.cmssportswear.com/tshirt-personalizada", 3],
    ["wind-vest", "Wind Vest (Windbreaker)", "Windbreaker Vest", "vest", "https://www.cmssportswear.com/hombres-corta-vientos-chalecos", 4],
  ];
  for (const p of products) {
    insertProduct.run(...p);
  }

  // Insert pricing tiers
  const insertTier = db.prepare(
    "INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd) VALUES (?, ?, ?, ?, ?)"
  );

  // PRO LINE pricing
  const proTiers = [
    [1, 1, 45000, 91],
    [2, 5, 42000, 85],
    [6, 10, 40000, 81],
    [11, 20, 38000, 77],
    [21, 30, 36000, 73],
    [31, 50, 34000, 69],
    [51, 100, 29000, 59],
  ];
  for (const t of proTiers) {
    insertTier.run("pro-jersey", t[0], t[1], t[2], t[3]);
  }

  // Enduro pricing
  const enduroTiers = [
    [1, 1, 32000, 64.65],
    [2, 5, 30000, 60.61],
    [6, 10, 28000, 56.57],
    [11, 20, 26000, 52.53],
    [21, 30, 24000, 48.48],
    [31, 50, 22000, 44.44],
    [51, 100, 20000, 40.40],
  ];
  for (const t of enduroTiers) {
    insertTier.run("enduro-jersey", t[0], t[1], t[2], t[3]);
  }

  // Wind vest pricing (same as enduro long)
  for (const t of enduroTiers) {
    insertTier.run("wind-vest", t[0], t[1], t[2], t[3]);
  }

  // Enduro short sleeve pricing
  const enduroShortTiers = [
    [1, 1, 24000, 48.48],
    [2, 5, 22000, 44.44],
    [6, 10, 21000, 42.42],
    [11, 20, 20000, 40.40],
    [21, 30, 18000, 36.36],
    [31, 50, 16000, 32.32],
    [51, 100, 14000, 28.28],
  ];
  for (const t of enduroShortTiers) {
    insertTier.run("enduro-short", t[0], t[1], t[2], t[3]);
  }

  // Insert sizes
  const insertSize = db.prepare(
    "INSERT INTO sizes (id, name, sort_order) VALUES (?, ?, ?)"
  );
  const sizes = [
    ["xs", "XS", 1],
    ["s", "S", 2],
    ["m", "M", 3],
    ["l", "L", 4],
    ["xl", "XL", 5],
    ["xxl", "XXL", 6],
    ["xxxl", "XXXL", 7],
    ["4xl", "4XL", 8],
    ["5xl", "5XL", 9],
  ];
  for (const s of sizes) {
    insertSize.run(...s);
  }

  // Insert default exchange rate (₡495 = $1)
  db.prepare("INSERT INTO exchange_rates (crc_to_usd) VALUES (?)").run(0.00202); // 1/495
}
