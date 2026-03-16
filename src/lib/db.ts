import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "orders.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      example_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_type_id TEXT NOT NULL,
      min_qty INTEGER NOT NULL,
      max_qty INTEGER NOT NULL,
      price_crc REAL NOT NULL,
      price_usd REAL NOT NULL,
      FOREIGN KEY (product_type_id) REFERENCES product_types(id)
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_type_id) REFERENCES product_types(id),
      FOREIGN KEY (design_id) REFERENCES designs(id),
      FOREIGN KEY (size_id) REFERENCES sizes(id)
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
  `);

  // Ensure the sequence row exists
  db.prepare(`INSERT OR IGNORE INTO order_number_seq (id, next_val) VALUES (1, 100)`).run();

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

  // Seed initial data if tables are empty
  const designCount = db.prepare("SELECT COUNT(*) as count FROM designs").get() as { count: number };
  if (designCount.count === 0) {
    seedData(db);
  }
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
    ["enduro-jersey", "BMX / Enduro / Downhill Jersey", "Long Sleeve Jersey", "jersey", "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado", 2],
    ["wind-vest", "Wind Vest (Windbreaker)", "Windbreaker Vest", "vest", "https://www.cmssportswear.com/hombres-corta-vientos-chalecos", 3],
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

  // Wind vest pricing (same as enduro)
  for (const t of enduroTiers) {
    insertTier.run("wind-vest", t[0], t[1], t[2], t[3]);
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
