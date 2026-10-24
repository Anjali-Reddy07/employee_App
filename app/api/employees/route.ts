import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, initDb } from "@/app/lib/db";
import { sendEmployeeNotification, type EmployeeSnapshot } from "@/app/lib/email";

export const runtime = "nodejs";

// ─── Row Types ────────────────────────────────────────────────────────────────
interface EmployeeRow {
  employee_id:  number;
  name:         string;
  email_id:     string | null;
  phone_number: string | null;
  address:      string | null;
  salary:       number | null;
  [key: string]: unknown;
}

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
    await initDb();
    const result = await query(`
      SELECT employee_id, name, email_id, phone_number, address, salary
      FROM employee
      ORDER BY employee_id DESC;
    `);
    return NextResponse.json({ employees: result.rows });
  } catch (error) {
    console.error("Failed to fetch employees from Neon.", error);
    return NextResponse.json(
      { error: "Unable to fetch employees. Verify your DATABASE_URL is set correctly." },
      { status: 500 }
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

    await initDb();

    // Fetch full record before deleting so the email has all details
    const fetchResult = await query<EmployeeRow>(
      `SELECT employee_id, name, email_id, phone_number, address, salary
       FROM employee WHERE employee_id = $1;`,
      [Number(id)]
    );

    const record = fetchResult.rows[0];
    if (!record) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const deleteResult = await query(
      `DELETE FROM employee WHERE employee_id = $1;`,
      [Number(id)]
    );

    const performedBy = await getAdminUser();

    // Email notification
    await sendEmployeeNotification({
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
      rowsAffected: deleteResult.rowCount ?? 0,
    });
  } catch (error) {
    console.error("Failed to delete employee from Neon.", error);
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
    await initDb();

    // Snapshot BEFORE values for the diff email
    const beforeResult = await query<EmployeeRow>(
      `SELECT employee_id, name, email_id, phone_number, address, salary
       FROM employee WHERE employee_id = $1;`,
      [employeeId]
    );

    const beforeRecord = beforeResult.rows[0];
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

    // Perform the UPDATE
    const result = await query(
      `UPDATE employee
       SET name         = $1,
           email_id     = $2,
           phone_number = $3,
           address      = $4,
           salary       = $5
       WHERE employee_id = $6;`,
      [name, email || null, phone || null, address || null, salary, employeeId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    const performedBy = await getAdminUser();

    // Email notification with full diff
    await sendEmployeeNotification({
      action: "Updated",
      performedBy,
      previous: previousSnapshot,
      current: { employeeId, name, email, phone, address, salary },
    });

    return NextResponse.json({ success: true, employeeId });
  } catch (error) {
    console.error("Failed to update employee in Neon.", error);
    return NextResponse.json(
      { error: "Unable to update employee. Verify your DATABASE_URL is set correctly." },
      { status: 500 }
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
    await initDb();

    const result = await query<{ employee_id: number }>(
      `INSERT INTO employee (name, email_id, phone_number, address, salary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING employee_id;`,
      [name, email || null, phone || null, address || null, salary]
    );

    const newEmployeeId: number = result.rows[0].employee_id;
    console.log(`[Employee API] ✓ Employee created successfully with ID #${newEmployeeId}.`);

    const performedBy = await getAdminUser();

    // Email notification
    await sendEmployeeNotification({
      action: "Added",
      performedBy,
      current: { employeeId: newEmployeeId, name, email, phone, address, salary },
    });

    return NextResponse.json({ employeeId: newEmployeeId }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { code?: string };
    console.error(`[Employee API] ✗ FAILED to save employee '${name}' to Neon:`, err);
    return NextResponse.json(
      {
        error: "Unable to save employee. Verify your DATABASE_URL is set correctly.",
        details: err.message || "Unknown database error",
        code: err.code || "DB_ERROR",
      },
      { status: 500 }
    );
  }
}

// Export PATCH handler as alias to PUT for flexibility
export const PATCH = PUT;
