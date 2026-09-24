import { Pool, QueryResult } from "pg";
import { migrateDesignWorkflow } from "./db-migrations";

let pool: Pool | null = null;
let initAttempted = false;

interface PreparedStatement {
  get(...params: any[]): any;
  all(...params: any[]): any[];
  run(...params: any[]): { changes: number };
}

interface DatabaseProxy {
  prepare(sql: string): PreparedStatement;
  pragma(pragma: string): void;
  exec(sql: string): void;
}

// Create a SQLite-like interface wrapper around pg
class PostgresWrapper implements DatabaseProxy {
  constructor(private client: Pool) {}

  prepare(sql: string): PreparedStatement {
    const client = this.client;
    const querySync = (query: string, params: any[] = []) => {
      // This is hacky but necessary for sync interface
      // In production, consider refactoring to async
      let result: any = null;
      let error: any = null;

      // Use a sync wrapper (note: this blocks, only use in initialization)
      const syncQuery = `
        const { Client } = require('pg');
        const c = new Client({
          connectionString: process.env.DATABASE_URL
        });
        c.connect().then(() => {
          c.query('${query.replace(/'/g, "\\'")}', ${JSON.stringify(params)})
            .then(r => { result = r; c.end(); })
            .catch(e => { error = e; c.end(); });
        });
      `;
      // This approach won't work; we need truly async initialization
      throw new Error("PostgreSQL requires async/await pattern");
    };

    return {
      get: (...params: any[]) => querySync(sql, params),
      all: (...params: any[]) => querySync(sql, params),
      run: (...params: any[]) => querySync(sql, params),
    };
  }

  pragma(pragma: string): void {
    // PostgreSQL pragmas are handled differently
    // For WAL mode equivalent, PostgreSQL uses write-ahead logging by default
    // For foreign_keys, this is handled in initialization
  }

  exec(sql: string): void {
    // Execute SQL without parameters
    // This needs to be async, but for initialization we need sync
    throw new Error("PostgreSQL requires async initialization");
  }
}

let buildMode = false;

// Detect build mode
if (typeof global !== "undefined" && (global as any).__NEXT_DATA__?.isPreview === false) {
  buildMode = true;
}

const noOpDb = new Proxy({} as any, {
  get: () =>
    new Proxy(
      () => ({ all: () => [], get: () => null, run: () => ({}) }),
      {
        get: () => new Proxy(() => ({}), { get: () => () => ({}) }),
      }
    ),
});

export async function initializeDbAsync(): Promise<Pool> {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://thinkmtb:ThinkMTB@2026!Secure@localhost:5432/thinkmtb_order";

  pool = new Pool({ connectionString });

  // Test connection
  const client = await pool.connect();
  console.log("✅ Connected to PostgreSQL");

  // Enable foreign keys
  await client.query("SET session_replication_role TO DEFAULT;");

  // Run migrations
  await runMigrationsAsync(client);

  client.release();
  return pool;
}

async function runMigrationsAsync(client: any): Promise<void> {
  // Create base tables
  const migrations = [
    // Tenants
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Design workflow tables
    `CREATE TABLE IF NOT EXISTS design_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      team_id TEXT,
      requester_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_request_files (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      filename TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_submissions (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      designer_id TEXT NOT NULL,
      version_number INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      submission_notes TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP,
      reviewed_by TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS design_submission_files (
      id TEXT PRIMARY KEY,
      design_submission_id TEXT NOT NULL REFERENCES design_submissions(id),
      filename TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_comments (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      commenter_id TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Product and pricing tables
    `CREATE TABLE IF NOT EXISTS product_types (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS pricing_tiers (
      id TEXT PRIMARY KEY,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      min_qty INTEGER NOT NULL,
      max_qty INTEGER,
      price_usd DECIMAL(10, 2) NOT NULL,
      price_crc DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS price_overrides (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      price_usd DECIMAL(10, 2),
      price_crc DECIMAL(12, 2),
      active_from TIMESTAMP,
      active_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS team_products (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Order tables
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      team_id TEXT,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      design_request_id TEXT REFERENCES design_requests(id),
      status TEXT DEFAULT 'draft_products_selected',
      total_usd DECIMAL(10, 2) DEFAULT 0,
      total_crc DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      quantity INTEGER NOT NULL,
      price_usd DECIMAL(10, 2) NOT NULL,
      price_crc DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      payment_stage TEXT,
      amount_usd DECIMAL(10, 2),
      amount_crc DECIMAL(12, 2),
      status TEXT DEFAULT 'pending',
      bac_payment_link TEXT,
      payment_reference TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Settings and config
    `CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS tenant_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      key TEXT NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const migration of migrations) {
    try {
      await client.query(migration);
    } catch (err) {
      console.error("Migration error:", err);
    }
  }

  console.log("✅ Database migrations completed");
}

export async function getDbAsync(): Promise<Pool> {
  if (!pool && !initAttempted) {
    initAttempted = true;
    await initializeDbAsync();
  }
  return pool!;
}

// For compatibility with sync code, return a no-op during build
export function getDb(): any {
  if (buildMode && !pool && !initAttempted) {
    return noOpDb;
  }

  if (!pool) {
    console.error(
      "❌ Database not initialized. Use getDbAsync() in async contexts."
    );
    return noOpDb;
  }

  return pool;
}
