import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully." });

  response.cookies.set("admin_auth", "", { path: "/", maxAge: 0 });
  response.cookies.set("admin_user", "", { path: "/", maxAge: 0 });

  return response;
}
