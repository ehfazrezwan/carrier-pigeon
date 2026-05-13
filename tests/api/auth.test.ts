import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

beforeEach(() => {
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_PASSWORD", "open-sesame");
  vi.stubEnv("SESSION_SECRET", "secret-token");
  vi.resetModules();
});

function postReq(body: unknown) {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth", () => {
  it("returns 401 with no password", async () => {
    const { POST } = await import("@/app/api/auth/route");
    const res = await POST(postReq({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "Wrong secret word." });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns 401 on wrong password", async () => {
    const { POST } = await import("@/app/api/auth/route");
    const res = await POST(postReq({ password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("sets cookie and returns ok on correct password", async () => {
    const { POST } = await import("@/app/api/auth/route");
    const res = await POST(postReq({ password: "open-sesame" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      "cp-auth",
      "secret-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 24 * 30,
      })
    );
  });

  it("uses secure cookie when NODE_ENV=production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { POST } = await import("@/app/api/auth/route");
    await POST(postReq({ password: "open-sesame" }));
    expect(cookieStore.set).toHaveBeenCalledWith(
      "cp-auth",
      "secret-token",
      expect.objectContaining({ secure: true })
    );
  });
});

describe("DELETE /api/auth", () => {
  it("deletes cookie and returns ok", async () => {
    const { DELETE } = await import("@/app/api/auth/route");
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(cookieStore.delete).toHaveBeenCalledWith("cp-auth");
  });
});
