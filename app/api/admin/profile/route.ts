import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query, initDb } from "@/app/lib/db";

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
    await initDb();
    const result = await query<{ admin_id: number; username: string; created_at: string }>(
      `SELECT admin_id, username, created_at FROM admin_user WHERE username = $1;`,
      [username]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    return NextResponse.json({ admin: result.rows[0] });
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
  const newUsername     = typeof data.newUsername     === "string" ? data.newUsername.trim() : "";
  const currentPassword = typeof data.currentPassword === "string" ? data.currentPassword    : "";
  const newPassword     = typeof data.newPassword     === "string" ? data.newPassword        : "";

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
    await initDb();

    // Verify current password
    const fetchResult = await query<{ admin_id: number; password: string }>(
      `SELECT admin_id, password FROM admin_user WHERE username = $1;`,
      [currentUsername]
    );

    const admin = fetchResult.rows[0];
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
    const finalUsername     = newUsername || currentUsername;
    const finalPasswordHash = newPassword
      ? await bcrypt.hash(newPassword, 12)
      : storedPwd.startsWith("$2") ? storedPwd : await bcrypt.hash(storedPwd, 12);

    // Check if new username conflicts with another account
    if (finalUsername !== currentUsername) {
      const conflict = await query(
        `SELECT 1 FROM admin_user WHERE username = $1;`,
        [finalUsername]
      );
      if (conflict.rows.length > 0) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
    }

    await query(
      `UPDATE admin_user
       SET username = $1, password = $2
       WHERE admin_id = $3;`,
      [finalUsername, finalPasswordHash, admin.admin_id]
    );

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
