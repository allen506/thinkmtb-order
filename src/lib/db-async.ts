/**
 * Async Database Abstraction Layer
 * PostgreSQL-focused implementation for Node.js/Next.js
 */

import { Pool, QueryResultRow } from "pg";

let pgPool: Pool | null = null;

/**
 * Initialize PostgreSQL connection pool
 */
async function initPostgres(): Promise<Pool> {
  if (pgPool) return pgPool;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    await pgPool.query("SELECT 1");
    console.log("✅ Connected to PostgreSQL");
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:", error);
    throw error;
  }

  return pgPool;
}

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = await initPostgres();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return first result
 */
export async function queryOne<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an insert/update/delete
 */
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ changes: number; lastId?: string }> {
  const pool = await initPostgres();
  const result = await pool.query(sql, params);
  return { changes: result.rowCount || 0 };
}

/**
 * Execute multiple queries in a transaction
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const pool = await initPostgres();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tx: TransactionClient = {
      query: async <U extends QueryResultRow = any>(
        sql: string,
        params?: any[]
      ) => {
        const result = await client.query(sql, params);
        return result.rows as U[];
      },
      queryOne: async <U extends QueryResultRow = any>(
        sql: string,
        params?: any[]
      ) => {
        const result = await client.query(sql, params);
        return result.rows.length > 0 ? (result.rows[0] as U) : null;
      },
      execute: async (sql: string, params?: any[]) => {
        const result = await client.query(sql, params);
        return { changes: result.rowCount || 0 };
      },
    };

    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transaction client interface
 */
export interface TransactionClient {
  query<T extends QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]>;
  queryOne<T extends QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number }>;
}

/**
 * Close database connections (for testing/shutdown)
 */
export async function closeConnections() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

export { Pool };
