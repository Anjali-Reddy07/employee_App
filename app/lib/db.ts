import { Pool, QueryResultRow, QueryResult } from "@neondatabase/serverless";

// ─── Neon PostgreSQL Connection ───────────────────────────────────────────────
// Set DATABASE_URL in .env.local and Vercel environment variables.
// Format: postgresql://neondb_owner:<password>@<host>/neondb?sslmode=require

const connectionString = process.env.DATABASE_URL!;

// Singleton pool — reused across requests in the same server instance
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

// ─── Convenience query helper ─────────────────────────────────────────────────
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const p = getPool();
  const result = await p.query<T>(text, params);
  return result;
}

// ─── Schema Initialization ────────────────────────────────────────────────────
export async function ensureDatabaseSchema(): Promise<void> {
  try {
    console.log("[Neon] Verifying schema...");

    await query(`
      CREATE TABLE IF NOT EXISTS employee (
        employee_id  SERIAL PRIMARY KEY,
        name         VARCHAR(100)  NOT NULL,
        email_id     VARCHAR(150),
        phone_number VARCHAR(15),
        address      VARCHAR(255),
        salary       DECIMAL(18, 2)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_user (
        admin_id   SERIAL PRIMARY KEY,
        username   VARCHAR(100)  NOT NULL UNIQUE,
        password   VARCHAR(255)  NOT NULL,
        created_at TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    console.log("[Neon] ✓ Schema verified successfully.");
  } catch (err) {
    console.error("[Neon] ⚠️ Schema initialization warning:", err);
  }
}

// ─── Init (called once on startup) ───────────────────────────────────────────
let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await ensureDatabaseSchema();
}

export default getPool;
