import { describe, it, expect, vi, beforeEach } from "vitest";

const isAuthedMock = vi.fn();
const db = {
  listLettersWithReplyCounts: vi.fn(),
  getLetterBySlug: vi.fn(),
  createLetter: vi.fn(),
  getRepliesForLetter: vi.fn(),
  createReply: vi.fn(),
};
const generateSlugMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  isAuthed: () => isAuthedMock(),
  AUTH_COOKIE: "cp-auth",
}));
vi.mock("@/lib/db", () => ({
  getDB: async () => db,
}));
vi.mock("@/lib/slugs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/slugs")>("@/lib/slugs");
  return {
    ...actual,
    generateSlug: () => generateSlugMock(),
  };
});

beforeEach(() => {
  isAuthedMock.mockReset();
  Object.values(db).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  generateSlugMock.mockReset();
});

function postReq(body: unknown) {
  return new Request("http://localhost/api/letters", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/letters", () => {
  it("401 when not authed", async () => {
    isAuthedMock.mockResolvedValue(false);
    const { GET } = await import("@/app/api/letters/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns letters list when authed", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.listLettersWithReplyCounts.mockResolvedValue([{ id: "x", slug: "s", reply_count: 0 }]);
    const { GET } = await import("@/app/api/letters/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ letters: [{ id: "x", slug: "s", reply_count: 0 }] });
  });
});

describe("POST /api/letters", () => {
  it("401 when not authed", async () => {
    isAuthedMock.mockResolvedValue(false);
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(401);
  });

  it("400 when dialogue or body is missing", async () => {
    isAuthedMock.mockResolvedValue(true);
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "", body: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dialogue and body required" });
  });

  it("auto-generates slug when none provided, applying theme/sender defaults", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock.mockReturnValue("auto-slug-1");
    db.createLetter.mockResolvedValue({
      ok: true,
      letter: { id: "i", slug: "auto-slug-1", dialogue: "d", body: "b", theme: "dusk", sender_name: "The Carrier", created_at: "n" },
    });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(200);
    expect(db.createLetter).toHaveBeenCalledWith({
      slug: "auto-slug-1",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "The Carrier",
    });
  });

  it("retries auto-slug up to 5 times on duplicates", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock
      .mockReturnValueOnce("a")
      .mockReturnValueOnce("b")
      .mockReturnValueOnce("c")
      .mockReturnValueOnce("d")
      .mockReturnValueOnce("e");
    db.createLetter
      .mockResolvedValueOnce({ ok: false, reason: "duplicate-slug" })
      .mockResolvedValueOnce({ ok: false, reason: "duplicate-slug" })
      .mockResolvedValueOnce({ ok: true, letter: { slug: "c" } });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(200);
    expect(db.createLetter).toHaveBeenCalledTimes(3);
  });

  it("returns 500 if all 5 auto-slug attempts collide", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock.mockReturnValue("dup");
    db.createLetter.mockResolvedValue({ ok: false, reason: "duplicate-slug" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not generate unique slug" });
    expect(db.createLetter).toHaveBeenCalledTimes(5);
  });

  it("returns 500 when auto-slug path fails with unknown reason", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock.mockReturnValue("any");
    db.createLetter.mockResolvedValue({ ok: false, reason: "unknown", message: "fire" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "fire" });
  });

  it("falls back to default error text when unknown reason has no message", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock.mockReturnValue("any");
    db.createLetter.mockResolvedValue({ ok: false, reason: "unknown" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not save letter." });
  });

  it("validates custom slug and rejects invalid ones with 400", async () => {
    isAuthedMock.mockResolvedValue(true);
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(
      postReq({ dialogue: "d", body: "b", slug: "!!" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Slug must be/);
  });

  it("returns 409 on duplicate custom slug", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.createLetter.mockResolvedValue({ ok: false, reason: "duplicate-slug" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(
      postReq({ dialogue: "d", body: "b", slug: "my-slug" })
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "That slug is already taken." });
  });

  it("returns 500 on unknown error for custom slug", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.createLetter.mockResolvedValue({ ok: false, reason: "unknown", message: "kaboom" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b", slug: "my-slug" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "kaboom" });
  });

  it("falls back to default error text when custom slug unknown has no message", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.createLetter.mockResolvedValue({ ok: false, reason: "unknown" });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b", slug: "my-slug" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not save letter." });
  });

  it("uses provided theme and sender_name when set", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.createLetter.mockResolvedValue({
      ok: true,
      letter: { slug: "my-slug" },
    });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(
      postReq({ dialogue: "d", body: "b", slug: "my-slug", theme: "night", sender_name: "Bob" })
    );
    expect(res.status).toBe(200);
    expect(db.createLetter).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "night", sender_name: "Bob", slug: "my-slug" })
    );
  });

  it("ignores blank-string slug and uses auto path", async () => {
    isAuthedMock.mockResolvedValue(true);
    generateSlugMock.mockReturnValue("auto");
    db.createLetter.mockResolvedValue({ ok: true, letter: { slug: "auto" } });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(
      postReq({ dialogue: "d", body: "b", slug: "   " })
    );
    expect(res.status).toBe(200);
    expect(db.createLetter).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "auto" })
    );
  });

  it("normalizes a custom slug via slugify before validating", async () => {
    isAuthedMock.mockResolvedValue(true);
    db.createLetter.mockResolvedValue({
      ok: true,
      letter: { slug: "hello-world" },
    });
    const { POST } = await import("@/app/api/letters/route");
    const res = await POST(postReq({ dialogue: "d", body: "b", slug: "Hello World!" }));
    expect(res.status).toBe(200);
    expect(db.createLetter).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "hello-world" })
    );
  });
});
