import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import sql from "mssql/msnodesqlv8";
import { getSqlPool } from "@/app/lib/sql-server";
import { sendEmployeeNotification, type EmployeeSnapshot } from "@/app/lib/email";

export const runtime = "nodejs";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getAdminUser(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("admin_user")?.value || "Administrator";
  } catch {
    return "Administrator";
  }
}

// ─── GET – list all employees ─────────────────────────────────────────────────
export async function GET() {
  try {
    const pool = await getSqlPool();

    const result = await pool.request().query(`
      SELECT
        employee_id,
        name,
        email_id,
        phone_number,
        address,
        salary
      FROM dbo.Employee
      ORDER BY employee_id DESC;
    `);

    return NextResponse.json({ employees: result.recordset });
  } catch (error) {
    console.error("Failed to fetch employees from SQL Server.", error);
    return NextResponse.json(
      { error: "Unable to fetch employees. Verify SQL Server is running and the app has access to employee_db." },
      { status: 500 },
    );
  }
}

// ─── DELETE – remove employee ─────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid employee ID is required." }, { status: 400 });
    }

    const pool = await getSqlPool();

    // Fetch full record before deleting so the email has all details
    const fetchResult = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT employee_id, name, email_id, phone_number, address, salary
        FROM dbo.Employee WHERE employee_id = @id;
      `);

    const record = fetchResult.recordset[0];
    if (!record) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const result = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query(`DELETE FROM dbo.Employee WHERE employee_id = @id;`);

    const performedBy = await getAdminUser();

    // Fire-and-forget email notification
    sendEmployeeNotification({
      action: "Deleted",
      performedBy,
      current: {
        employeeId: record.employee_id,
        name:       record.name,
        email:      record.email_id,
        phone:      record.phone_number,
        address:    record.address,
        salary:     record.salary,
      },
    });

    return NextResponse.json({
      success: true,
      deletedId: Number(id),
      rowsAffected: result.rowsAffected[0],
    });
  } catch (error) {
    console.error("Failed to delete employee from SQL Server.", error);
    return NextResponse.json({ error: "Failed to delete employee record." }, { status: 500 });
  }
}

// ─── PUT – update employee ────────────────────────────────────────────────────
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const employeeId = Number(data.employee_id);
  const name    = typeof data.name         === "string" ? data.name.trim()         : "";
  const email   = typeof data.email_id     === "string" ? data.email_id.trim()     : "";
  const phone   = typeof data.phone_number === "string" ? data.phone_number.trim() : "";
  const address = typeof data.address      === "string" ? data.address.trim()      : "";

  let salary: number | null = null;
  if (data.salary !== undefined && data.salary !== null && data.salary !== "") {
    const num = Number(data.salary);
    if (!isNaN(num) && num >= 0) salary = num;
  }

  if (!employeeId || isNaN(employeeId)) {
    return NextResponse.json({ error: "A valid employee_id is required for update." }, { status: 400 });
  }
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name is required and must be at most 100 characters." }, { status: 400 });
  }
  if (email.length > 150 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Enter a valid email address of at most 150 characters." }, { status: 400 });
  }
  if (phone.length > 15) {
    return NextResponse.json({ error: "Phone number must be at most 15 characters." }, { status: 400 });
  }
  if (address.length > 255) {
    return NextResponse.json({ error: "Address must be at most 255 characters." }, { status: 400 });
  }

  try {
    const pool = await getSqlPool();

    // ── Snapshot BEFORE values for the diff email ──────────────────────────
    const beforeResult = await pool
      .request()
      .input("id", sql.Int, employeeId)
      .query(`
        SELECT employee_id, name, email_id, phone_number, address, salary
        FROM dbo.Employee WHERE employee_id = @id;
      `);

    const beforeRecord = beforeResult.recordset[0];
    if (!beforeRecord) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    const previousSnapshot: EmployeeSnapshot = {
      employeeId: beforeRecord.employee_id,
      name:       beforeRecord.name,
      email:      beforeRecord.email_id,
      phone:      beforeRecord.phone_number,
      address:    beforeRecord.address,
      salary:     beforeRecord.salary,
    };

    // ── Perform the UPDATE ─────────────────────────────────────────────────
    const result = await pool
      .request()
      .input("id",      sql.Int,            employeeId)
      .input("name",    sql.NVarChar(100),  name)
      .input("email",   sql.NVarChar(150),  email   || null)
      .input("phone",   sql.NVarChar(15),   phone   || null)
      .input("address", sql.NVarChar(255),  address || null)
      .input("salary",  sql.Decimal(18, 2), salary)
      .query(`
        UPDATE dbo.Employee
        SET name         = @name,
            email_id     = @email,
            phone_number = @phone,
            address      = @address,
            salary       = @salary
        WHERE employee_id = @id;
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    const performedBy = await getAdminUser();

    // Fire-and-forget email notification with full diff
    sendEmployeeNotification({
      action: "Updated",
      performedBy,
      previous: previousSnapshot,
      current: { employeeId, name, email, phone, address, salary },
    });

    return NextResponse.json({ success: true, employeeId });
  } catch (error) {
    console.error("Failed to update employee in SQL Server.", error);
    return NextResponse.json(
      { error: "Unable to update employee. Verify SQL Server is running and the app has access to employee_db." },
      { status: 500 },
    );
  }
}

// ─── POST – create employee ───────────────────────────────────────────────────
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name    = typeof data.name         === "string" ? data.name.trim()         : "";
  const email   = typeof data.email_id     === "string" ? data.email_id.trim()     : "";
  const phone   = typeof data.phone_number === "string" ? data.phone_number.trim() : "";
  const address = typeof data.address      === "string" ? data.address.trim()      : "";

  let salary: number | null = null;
  if (data.salary !== undefined && data.salary !== null && data.salary !== "") {
    const num = Number(data.salary);
    if (!isNaN(num) && num >= 0) salary = num;
  }

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name is required and must be at most 100 characters." }, { status: 400 });
  }
  if (email.length > 150 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Enter a valid email address of at most 150 characters." }, { status: 400 });
  }
  if (phone.length > 15) {
    return NextResponse.json({ error: "Phone number must be at most 15 characters." }, { status: 400 });
  }
  if (address.length > 255) {
    return NextResponse.json({ error: "Address must be at most 255 characters." }, { status: 400 });
  }

  console.log(`[Employee API] Received 'Add Employee' request:`, { name, email, phone, salary });

  try {
    const pool = await getSqlPool();

    console.log(`[Employee API] Executing INSERT into dbo.Employee for '${name}'...`);
    const result = await pool
      .request()
      .input("name",    sql.NVarChar(100),  name)
      .input("email",   sql.NVarChar(150),  email   || null)
      .input("phone",   sql.NVarChar(15),   phone   || null)
      .input("address", sql.NVarChar(255),  address || null)
      .input("salary",  sql.Decimal(18, 2), salary)
      .query(`
        INSERT INTO dbo.Employee (name, email_id, phone_number, address, salary)
        OUTPUT INSERTED.employee_id
        VALUES (@name, @email, @phone, @address, @salary);
      `);

    const newEmployeeId: number = result.recordset[0].employee_id;
    console.log(`[Employee API] ✓ Employee created successfully with ID #${newEmployeeId}.`);

    const performedBy = await getAdminUser();

    // Fire-and-forget email notification
    sendEmployeeNotification({
      action: "Added",
      performedBy,
      current: { employeeId: newEmployeeId, name, email, phone, address, salary },
    });

    return NextResponse.json({ employeeId: newEmployeeId }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string; number?: number; state?: string };
    const isConnError = !err.number && (err.code === "ESOCKET" || err.code === "ETIMEOUT" || err.message?.includes("connection") || err.message?.includes("login"));

    console.error(`[Employee API] ✗ FAILED to save employee '${name}' to SQL Server:`, {
      type: isConnError ? "Database Connection Failure" : "Database Query Execution Failure",
      message: err.message || String(error),
      code: err.code,
      sqlErrorNumber: err.number,
      sqlState: err.state,
      stack: err.stack,
    });

    return NextResponse.json(
      {
        error: "Unable to save employee. Verify SQL Server is running and the app has access to employee_db.",
        details: err.message || "Unknown database error",
        code: err.code || "DB_ERROR",
        hint: isConnError
          ? "Check that SQL Server (SQLEXPRESS) service is running and employee_db database exists."
          : "Check table schema and column data types.",
      },
      { status: 500 },
    );
  }
}

// Export PATCH handler as alias to PUT for flexibility
export const PATCH = PUT;
