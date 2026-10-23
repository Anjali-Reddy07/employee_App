import { NextResponse } from "next/server";
import sql from "mssql/msnodesqlv8";
import { getSqlPool } from "@/app/lib/sql-server";

export const runtime = "nodejs";

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid employee ID is required." }, { status: 400 });
    }

    const pool = await getSqlPool();

    const result = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query(`DELETE FROM dbo.Employee WHERE employee_id = @id;`);

    return NextResponse.json({ success: true, deletedId: Number(id), rowsAffected: result.rowsAffected[0] });
  } catch (error) {
    console.error("Failed to delete employee from SQL Server.", error);
    return NextResponse.json({ error: "Failed to delete employee record." }, { status: 500 });
  }
}

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
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email_id === "string" ? data.email_id.trim() : "";
  const phone = typeof data.phone_number === "string" ? data.phone_number.trim() : "";
  const address = typeof data.address === "string" ? data.address.trim() : "";
  
  let salary: number | null = null;
  if (data.salary !== undefined && data.salary !== null && data.salary !== "") {
    const num = Number(data.salary);
    if (!isNaN(num) && num >= 0) {
      salary = num;
    }
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

    const result = await pool
      .request()
      .input("id", sql.Int, employeeId)
      .input("name", sql.NVarChar(100), name)
      .input("email", sql.NVarChar(150), email || null)
      .input("phone", sql.NVarChar(15), phone || null)
      .input("address", sql.NVarChar(255), address || null)
      .input("salary", sql.Decimal(18, 2), salary)
      .query(`
        UPDATE dbo.Employee
        SET name = @name,
            email_id = @email,
            phone_number = @phone,
            address = @address,
            salary = @salary
        WHERE employee_id = @id;
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, employeeId });
  } catch (error) {
    console.error("Failed to update employee in SQL Server.", error);
    return NextResponse.json(
      { error: "Unable to update employee. Verify SQL Server is running and the app has access to employee_db." },
      { status: 500 },
    );
  }
}

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
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email_id === "string" ? data.email_id.trim() : "";
  const phone = typeof data.phone_number === "string" ? data.phone_number.trim() : "";
  const address = typeof data.address === "string" ? data.address.trim() : "";
  
  let salary: number | null = null;
  if (data.salary !== undefined && data.salary !== null && data.salary !== "") {
    const num = Number(data.salary);
    if (!isNaN(num) && num >= 0) {
      salary = num;
    }
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

    const result = await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("email", sql.NVarChar(150), email || null)
      .input("phone", sql.NVarChar(15), phone || null)
      .input("address", sql.NVarChar(255), address || null)
      .input("salary", sql.Decimal(18, 2), salary)
      .query(`
        INSERT INTO dbo.Employee (name, email_id, phone_number, address, salary)
        OUTPUT INSERTED.employee_id
        VALUES (@name, @email, @phone, @address, @salary);
      `);

    return NextResponse.json({ employeeId: result.recordset[0].employee_id }, { status: 201 });
  } catch (error) {
    console.error("Failed to save employee to SQL Server.", error);
    return NextResponse.json(
      { error: "Unable to save employee. Verify SQL Server is running and the app has access to employee_db." },
      { status: 500 },
    );
  }
}
