import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, initDb } from "@/app/lib/db";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/auth/setup
// Returns whether first-time setup is needed (no admin accounts exist yet)
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await initDb();
    const result = await query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM admin_user;`);
    const total = Number(result.rows[0]?.total ?? 0);
    return NextResponse.json({ needsSetup: total === 0 });
  } catch (error) {
    console.error("[Setup] GET error:", error);
    return NextResponse.json({ error: "Database error. Verify your DATABASE_URL is set correctly." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/setup
// Creates the first admin account (only allowed when no admin exists)
// ---------------------------------------------------------------------------
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
  const username = typeof data.username === "string" ? data.username.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";

  // Validation
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (username.length > 100) {
    return NextResponse.json({ error: "Username must be at most 100 characters." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username may only contain letters, numbers, underscores, hyphens, and dots." },
      { status: 400 }
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await initDb();

    // Guard: only allow setup if no admin exists yet
    const countResult = await query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM admin_user;`);
    const total = Number(countResult.rows[0]?.total ?? 0);
    if (total > 0) {
      return NextResponse.json(
        { error: "Setup is already complete. An admin account already exists." },
        { status: 409 }
      );
    }

    // Hash the password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert the new admin
    const insertResult = await query<{ admin_id: number; username: string; created_at: string }>(
      `INSERT INTO admin_user (username, password)
       VALUES ($1, $2)
       RETURNING admin_id, username, created_at;`,
      [username, passwordHash]
    );

    const newAdmin = insertResult.rows[0];
    console.log(`[Setup] First admin account created: '${newAdmin.username}' (ID #${newAdmin.admin_id})`);

    // Auto sign-in: set auth cookies immediately after setup
    const response = NextResponse.json(
      {
        success: true,
        message: "Admin account created successfully. You are now signed in.",
        admin: { admin_id: newAdmin.admin_id, username: newAdmin.username },
      },
      { status: 201 }
    );

    const maxAge = 60 * 60 * 24 * 7; // 7 days
    response.cookies.set("admin_auth", "true", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    response.cookies.set("admin_user", newAdmin.username, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("[Setup] POST error:", error);
    return NextResponse.json({ error: "Database error during admin creation." }, { status: 500 });
  }
}
