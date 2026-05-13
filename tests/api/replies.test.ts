import { describe, it, expect, vi, beforeEach } from "vitest";

const db = {
  getLetterBySlug: vi.fn(),
  createReply: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: async () => db,
}));

beforeEach(() => {
  db.getLetterBySlug.mockReset();
  db.createReply.mockReset();
});

function postReq(body: unknown) {
  return new Request("http://localhost/api/replies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/replies", () => {
  it("returns 400 when slug or body missing", async () => {
    const { POST } = await import("@/app/api/replies/route");

    let res = await POST(postReq({ slug: "", body: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Slug and body required" });

    res = await POST(postReq({ slug: "x", body: "" }));
    expect(res.status).toBe(400);

    res = await POST(postReq({ slug: "", body: "y" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body exceeds 5000 chars", async () => {
    const { POST } = await import("@/app/api/replies/route");
    const res = await POST(postReq({ slug: "x", body: "a".repeat(5001) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Reply too long" });
  });

  it("returns 404 when slug doesn't map to a letter", async () => {
    db.getLetterBySlug.mockResolvedValue(null);
    const { POST } = await import("@/app/api/replies/route");
    const res = await POST(postReq({ slug: "x", body: "y" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Letter not found" });
  });

  it("creates reply with provided reader_name", async () => {
    db.getLetterBySlug.mockResolvedValue({ id: "L" });
    db.createReply.mockResolvedValue({ id: "R", letter_id: "L", body: "hi", reader_name: "Alice", created_at: "" });
    const { POST } = await import("@/app/api/replies/route");
    const res = await POST(postReq({ slug: "x", body: "hi", reader_name: "Alice" }));
    expect(res.status).toBe(200);
    expect(db.createReply).toHaveBeenCalledWith({
      letter_id: "L",
      body: "hi",
      reader_name: "Alice",
    });
  });

  it("defaults reader_name to Anonymous when missing", async () => {
    db.getLetterBySlug.mockResolvedValue({ id: "L" });
    db.createReply.mockResolvedValue({ id: "R" });
    const { POST } = await import("@/app/api/replies/route");
    await POST(postReq({ slug: "x", body: "hi" }));
    expect(db.createReply).toHaveBeenCalledWith({
      letter_id: "L",
      body: "hi",
      reader_name: "Anonymous",
    });
  });
});
