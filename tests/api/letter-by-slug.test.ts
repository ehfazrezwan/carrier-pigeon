import { describe, it, expect, vi, beforeEach } from "vitest";

const isAuthedMock = vi.fn();
const db = {
  getLetterBySlug: vi.fn(),
  getRepliesForLetter: vi.fn(),
};

vi.mock("@/lib/auth", () => ({
  isAuthed: () => isAuthedMock(),
  AUTH_COOKIE: "cp-auth",
}));
vi.mock("@/lib/db", () => ({
  getDB: async () => db,
}));

beforeEach(() => {
  isAuthedMock.mockReset();
  db.getLetterBySlug.mockReset();
  db.getRepliesForLetter.mockReset();
});

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /api/letters/[slug]", () => {
  it("returns 404 when letter not found", async () => {
    db.getLetterBySlug.mockResolvedValue(null);
    isAuthedMock.mockResolvedValue(false);
    const { GET } = await import("@/app/api/letters/[slug]/route");
    const res = await GET(new Request("http://x"), ctx("missing"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Letter not found" });
  });

  it("returns letter only when not authed", async () => {
    db.getLetterBySlug.mockResolvedValue({ id: "L", slug: "s" });
    isAuthedMock.mockResolvedValue(false);
    const { GET } = await import("@/app/api/letters/[slug]/route");
    const res = await GET(new Request("http://x"), ctx("s"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ letter: { id: "L", slug: "s" } });
    expect(db.getRepliesForLetter).not.toHaveBeenCalled();
  });

  it("returns letter + replies when authed", async () => {
    db.getLetterBySlug.mockResolvedValue({ id: "L", slug: "s" });
    isAuthedMock.mockResolvedValue(true);
    db.getRepliesForLetter.mockResolvedValue([{ id: "r1" }]);
    const { GET } = await import("@/app/api/letters/[slug]/route");
    const res = await GET(new Request("http://x"), ctx("s"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      letter: { id: "L", slug: "s" },
      replies: [{ id: "r1" }],
    });
    expect(db.getRepliesForLetter).toHaveBeenCalledWith("L");
  });
});
