import sql from "mssql/msnodesqlv8";

// ─── SQL Server Configuration ──────────────────────────────────────────────────
const server = process.env.SQL_SERVER || "localhost\\SQLEXPRESS";
const database = process.env.SQL_DATABASE || "employee_db";
const driver = process.env.SQL_DRIVER || "ODBC Driver 18 for SQL Server";
const encrypt = process.env.SQL_ENCRYPT === "true";

export const connectionConfig: sql.config = {
  server,
  database,
  driver,
  connectionTimeout: 15000, // 15 seconds connection timeout
  requestTimeout: 15000,    // 15 seconds query timeout
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    encrypt,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 15000,
  },
};

// ─── Connection Pool State ─────────────────────────────────────────────────────
let activePool: sql.ConnectionPool | null = null;
let connectingPromise: Promise<sql.ConnectionPool> | null = null;

// ─── Schema Migration & Initialization ─────────────────────────────────────────
export async function ensureDatabaseSchema(pool: sql.ConnectionPool): Promise<void> {
  try {
    console.log(`[SQL Server] Verifying schema for database '${database}'...`);

    // 1. Ensure Employee table and salary column
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.Employee', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Employee (
          employee_id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          email_id NVARCHAR(150) NULL,
          phone_number NVARCHAR(15) NULL,
          address NVARCHAR(255) NULL,
          salary DECIMAL(18, 2) NULL
        );
      END
      ELSE
      BEGIN
        IF COL_LENGTH(N'dbo.Employee', N'salary') IS NULL
        BEGIN
          ALTER TABLE dbo.Employee ADD salary DECIMAL(18, 2) NULL;
        END;
      END;
    `);

    // 2. Ensure AdminUser table exists
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.AdminUser', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AdminUser (
          admin_id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(100) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT GETDATE()
        );
      END;
    `);

    console.log(`[SQL Server] ✓ Schema verified successfully for '${database}'.`);
  } catch (err: unknown) {
    const error = err as Error & { code?: string; number?: number };
    console.error("[SQL Server] ⚠️ Schema initialization warning:", {
      message: error.message,
      code: error.code,
      number: error.number,
    });
  }
}

// ─── Connection Pool Factory ───────────────────────────────────────────────────
/**
 * getSqlPool
 * Returns a healthy SQL Server ConnectionPool instance.
 * Automatically handles reconnection, connection pooling, and error events.
 */
export async function getSqlPool(): Promise<sql.ConnectionPool> {
  // 1. If an active, connected pool exists, return it
  if (activePool && activePool.connected) {
    return activePool;
  }

  // 2. If a connection attempt is already in flight, await it
  if (connectingPromise) {
    return connectingPromise;
  }

  // 3. Initiate a new connection pool
  console.log(`[SQL Server] Establishing connection pool to '${server}' (Database: '${database}', Driver: '${driver}')...`);

  connectingPromise = (async () => {
    try {
      const pool = new sql.ConnectionPool(connectionConfig);

      // Register error listener on the pool to capture background connection drops
      pool.on("error", (err) => {
        console.error("[SQL Server] Pool error event triggered:", err);
        // Invalidate active pool reference so the next request reconnects cleanly
        if (activePool === pool) {
          activePool = null;
        }
      });

      const connectedPool = await pool.connect();
      console.log(`[SQL Server] ✓ Connected successfully to ${server}/${database}`);

      // Run schema checks
      await ensureDatabaseSchema(connectedPool);

      activePool = connectedPool;
      return connectedPool;
    } catch (err: unknown) {
      const error = err as Error & { code?: string; number?: number; state?: string };
      console.error("[SQL Server] ✗ Connection failed:", {
        server,
        database,
        driver,
        message: error.message || String(err),
        code: error.code,
        number: error.number,
        state: error.state,
      });

      // Reset pool pointers on failure so subsequent attempts can retry
      activePool = null;
      throw err;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

export default getSqlPool;
