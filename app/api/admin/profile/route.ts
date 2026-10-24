import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import sql from "mssql/msnodesqlv8";
import bcrypt from "bcryptjs";
import { getSqlPool } from "@/app/lib/sql-server";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Auth guard helper
// ---------------------------------------------------------------------------
async function getAuthenticatedUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  const isAuth = cookieStore.get("admin_auth")?.value === "true";
  const username = cookieStore.get("admin_user")?.value;
  if (!isAuth || !username) return null;
  return username;
}

// ---------------------------------------------------------------------------
// GET /api/admin/profile  – returns the current admin's username
// ---------------------------------------------------------------------------
export async function GET() {
  const username = await getAuthenticatedUsername();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("username", sql.NVarChar(100), username)
      .query(`SELECT admin_id, username, created_at FROM dbo.AdminUser WHERE username = @username;`);

    if (!result.recordset[0]) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    return NextResponse.json({ admin: result.recordset[0] });
  } catch (error) {
    console.error("[Admin Profile] GET error:", error);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/admin/profile  – update username and/or password
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  const currentUsername = await getAuthenticatedUsername();
  if (!currentUsername) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
  const newUsername = typeof data.newUsername === "string" ? data.newUsername.trim() : "";
  const currentPassword = typeof data.currentPassword === "string" ? data.currentPassword : "";
  const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required to make changes." }, { status: 400 });
  }
  if (newUsername && newUsername.length > 100) {
    return NextResponse.json({ error: "Username must be at most 100 characters." }, { status: 400 });
  }
  if (newPassword && newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  try {
    const pool = await getSqlPool();

    // Verify current password
    const fetchResult = await pool
      .request()
      .input("username", sql.NVarChar(100), currentUsername)
      .query(`SELECT admin_id, password FROM dbo.AdminUser WHERE username = @username;`);

    const admin = fetchResult.recordset[0];
    if (!admin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const storedPwd: string = admin.password;
    const isBcrypt = storedPwd.startsWith("$2b$") || storedPwd.startsWith("$2a$");
    const passwordOk = isBcrypt
      ? await bcrypt.compare(currentPassword, storedPwd)
      : storedPwd === currentPassword;

    if (!passwordOk) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    // Determine final values
    const finalUsername = newUsername || currentUsername;
    const finalPasswordHash = newPassword
      ? await bcrypt.hash(newPassword, 12)
      : storedPwd.startsWith("$2") ? storedPwd : await bcrypt.hash(storedPwd, 12);

    // Check if new username conflicts with another account
    if (finalUsername !== currentUsername) {
      const conflict = await pool
        .request()
        .input("newUsername", sql.NVarChar(100), finalUsername)
        .query(`SELECT 1 FROM dbo.AdminUser WHERE username = @newUsername;`);
      if (conflict.recordset.length > 0) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
    }

    await pool
      .request()
      .input("newUsername", sql.NVarChar(100), finalUsername)
      .input("newPassword", sql.NVarChar(255), finalPasswordHash)
      .input("adminId", sql.Int, admin.admin_id)
      .query(`
        UPDATE dbo.AdminUser
        SET username = @newUsername, password = @newPassword
        WHERE admin_id = @adminId;
      `);

    // Update auth cookie if username changed
    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      usernameChanged: finalUsername !== currentUsername,
      newUsername: finalUsername,
    });

    if (finalUsername !== currentUsername) {
      const maxAge = 60 * 60 * 24 * 7;
      response.cookies.set("admin_user", finalUsername, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }

    return response;
  } catch (error) {
    console.error("[Admin Profile] PUT error:", error);
    return NextResponse.json({ error: "Database error during profile update." }, { status: 500 });
  }
}
