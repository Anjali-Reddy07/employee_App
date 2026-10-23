import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const isAuth = cookieStore.get("admin_auth")?.value === "true";
  const username = cookieStore.get("admin_user")?.value || "admin";

  if (!isAuth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: { username } });
}
