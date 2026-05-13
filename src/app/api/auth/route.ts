import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, error: "Wrong secret word." }, { status: 401 });
  }
  const store = await cookies();
  store.set(AUTH_COOKIE, process.env.SESSION_SECRET!, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  return Response.json({ ok: true });
}
