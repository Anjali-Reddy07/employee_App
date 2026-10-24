import { NextResponse } from "next/server";
import sql from "mssql/msnodesqlv8";
import bcrypt from "bcryptjs";
import { getSqlPool } from "@/app/lib/sql-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid credentials format." }, { status: 400 });
  }

  const { username, password } = body as Record<string, unknown>;

  const cleanUsername = typeof username === "string" ? username.trim() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanUsername || !cleanPassword) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  try {
    const pool = await getSqlPool();

    // Fetch admin record (password may be plain text or bcrypt hash)
    const result = await pool
      .request()
      .input("username", sql.NVarChar(100), cleanUsername)
      .query(`
        SELECT admin_id, username, password
        FROM dbo.AdminUser
        WHERE username = @username;
      `);

    const user = result.recordset[0];

    if (!user) {
      return NextResponse.json(
        { error: "Invalid admin username or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Support both bcrypt hashes ($2b$...) and legacy plain-text passwords
    const storedPassword: string = user.password;
    const isBcrypt = storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2a$");
    let passwordMatch = false;

    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(cleanPassword, storedPassword);
    } else {
      // Legacy plain-text match — then upgrade to hash in-place
      passwordMatch = storedPassword === cleanPassword;
      if (passwordMatch) {
        const hash = await bcrypt.hash(cleanPassword, 12);
        await pool
          .request()
          .input("hash", sql.NVarChar(255), hash)
          .input("username", sql.NVarChar(100), cleanUsername)
          .query(`UPDATE dbo.AdminUser SET password = @hash WHERE username = @username;`);
        console.log(`[Auth] Migrated plain-text password to bcrypt hash for user '${cleanUsername}'.`);
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid admin username or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Set secure authentication cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user: { admin_id: user.admin_id, username: user.username },
      },
      { status: 200 }
    );

    const maxAge = 60 * 60 * 24 * 7; // 7 days
    response.cookies.set("admin_auth", "true", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    response.cookies.set("admin_user", user.username, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("SQL Server admin authentication failed:", error);
    return NextResponse.json(
      {
        error: "Database error during authentication. Verify SQL Server is running.",
        details: err?.message || String(error),
      },
      { status: 500 }
    );
  }
}
