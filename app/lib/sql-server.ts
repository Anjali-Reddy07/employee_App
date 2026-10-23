import sql from "mssql/msnodesqlv8";

const connectionConfig: sql.config = {
  server: process.env.SQL_SERVER || "localhost\\SQLEXPRESS",
  database: process.env.SQL_DATABASE || "employee_db",
  driver: process.env.SQL_DRIVER || "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export async function ensureDatabaseSchema(pool: sql.ConnectionPool) {
  try {
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

    // 2. Ensure AdminUser table and default admin credentials
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

      IF NOT EXISTS (SELECT 1 FROM dbo.AdminUser WHERE username = 'admin')
      BEGIN
        INSERT INTO dbo.AdminUser (username, password)
        VALUES ('admin', 'admin123');
      END;
    `);
  } catch (err) {
    console.error("Warning: schema initialization error in SQL Server:", err);
  }
}

export function getSqlPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(connectionConfig);
    poolPromise = pool
      .connect()
      .then(async (connectedPool) => {
        await ensureDatabaseSchema(connectedPool);
        return connectedPool;
      })
      .catch((error: unknown) => {
        poolPromise = undefined;
        throw error;
      });
  }

  return poolPromise;
}

export default getSqlPool;
