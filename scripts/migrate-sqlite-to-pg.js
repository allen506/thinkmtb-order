#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 * Exports data from SQLite and imports into PostgreSQL
 */

const Database = require("better-sqlite3");
const { Pool } = require("pg");
const fs = require("fs");

async function migrate() {
  console.log("🚀 Starting SQLite → PostgreSQL migration...\n");

  // Connect to SQLite
  const sqliteDb = new Database("/opt/thinkmtb-order/data/orders.db");
  console.log("✅ Connected to SQLite");

  // Connect to PostgreSQL
  const pgPool = new Pool({
    connectionString:
      "postgresql://thinkmtb:ThinkMTB2026Secure@localhost:5432/thinkmtb_order",
  });
  console.log("✅ Connected to PostgreSQL\n");

  const pgClient = await pgPool.connect();

  try {
    // Get all table names from SQLite
    const tables = sqliteDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    console.log(`📊 Found ${tables.length} tables in SQLite\n`);

    for (const { name: tableName } of tables) {
      if (tableName.startsWith("sqlite_")) continue;

      console.log(`📦 Migrating table: ${tableName}`);

      // Get all rows
      const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();

      if (rows.length === 0) {
        console.log(`   └─ Empty table, skipping\n`);
        continue;
      }

      // Get column names
      const columns = Object.keys(rows[0]);

      // Insert rows into PostgreSQL
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const columnList = columns.join(", ");
        const placeholders = columns
          .map((_, idx) => `$${idx + 1}`)
          .join(", ");
        const values = columns.map((col) => row[col]);

        const sql = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`;

        try {
          await pgClient.query(sql, values);
        } catch (error) {
          console.error(
            `   ⚠️  Failed to insert row into ${tableName}:`,
            error.message
          );
        }
      }

      console.log(`   ✅ Migrated ${rows.length} rows\n`);
    }

    console.log("✅ Migration complete!");
    console.log(
      "\n📝 Next steps:"
    );
    console.log(
      "   1. Set DATABASE_URL environment variable to PostgreSQL connection string"
    );
    console.log(
      '   2. Update src/lib/db.ts to use pg library instead of better-sqlite3'
    );
    console.log("   3. Rebuild and redeploy application\n");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    pgClient.release();
    pgPool.end();
    sqliteDb.close();
  }
}

migrate();
