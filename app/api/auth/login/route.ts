import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, initDb } from "@/app/lib/db";

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
    await initDb();

    // Fetch admin record
    const result = await query<{ admin_id: number; username: string; password: string }>(
      `SELECT admin_id, username, password FROM admin_user WHERE username = $1;`,
      [cleanUsername]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "Invalid admin username or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Support both bcrypt hashes and legacy plain-text passwords
    const storedPassword: string = user.password;
    const isBcrypt = storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2a$");
    let passwordMatch = false;

    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(cleanPassword, storedPassword);
    } else {
      // Legacy plain-text match — upgrade to hash in-place
      passwordMatch = storedPassword === cleanPassword;
      if (passwordMatch) {
        const hash = await bcrypt.hash(cleanPassword, 12);
        await query(
          `UPDATE admin_user SET password = $1 WHERE username = $2;`,
          [hash, cleanUsername]
        );
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
    console.error("Neon admin authentication failed:", error);
    return NextResponse.json(
      {
        error: "Database error during authentication. Verify your DATABASE_URL is set correctly.",
        details: err?.message || String(error),
      },
      { status: 500 }
    );
  }
}
