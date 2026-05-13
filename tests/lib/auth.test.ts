import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieStore = { get: vi.fn() };
const cookiesMock = vi.fn(async () => cookieStore);
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

beforeEach(() => {
  cookieStore.get.mockReset();
  cookiesMock.mockClear();
  redirectMock.mockClear();
  vi.stubEnv("SESSION_SECRET", "the-secret");
});

describe("AUTH_COOKIE", () => {
  it("exports the cookie name", async () => {
    const { AUTH_COOKIE } = await import("@/lib/auth");
    expect(AUTH_COOKIE).toBe("cp-auth");
  });
});

describe("isAuthed", () => {
  it("returns true when cookie matches SESSION_SECRET", async () => {
    cookieStore.get.mockReturnValue({ value: "the-secret" });
    const { isAuthed } = await import("@/lib/auth");
    expect(await isAuthed()).toBe(true);
  });

  it("returns false when cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { isAuthed } = await import("@/lib/auth");
    expect(await isAuthed()).toBe(false);
  });

  it("returns false when cookie value doesn't match", async () => {
    cookieStore.get.mockReturnValue({ value: "wrong" });
    const { isAuthed } = await import("@/lib/auth");
    expect(await isAuthed()).toBe(false);
  });

  it("returns false when token is empty string (falsy guard)", async () => {
    cookieStore.get.mockReturnValue({ value: "" });
    const { isAuthed } = await import("@/lib/auth");
    expect(await isAuthed()).toBe(false);
  });
});

describe("requireAuth", () => {
  it("does nothing when authed", async () => {
    cookieStore.get.mockReturnValue({ value: "the-secret" });
    const { requireAuth } = await import("@/lib/auth");
    await expect(requireAuth()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /admin when not authed", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { requireAuth } = await import("@/lib/auth");
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/admin");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });
});
