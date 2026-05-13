import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE = "cp-auth";

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  return !!token && token === process.env.SESSION_SECRET;
}

export async function requireAuth() {
  if (!(await isAuthed())) redirect("/admin");
}
