import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, hash } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (hash(String(password ?? "")) !== adminToken()) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
