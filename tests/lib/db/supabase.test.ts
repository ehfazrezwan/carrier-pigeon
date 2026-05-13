import { describe, it, expect, vi, beforeEach } from "vitest";

type Thenable<T> = Promise<T> & {
  eq: (col: string, val: unknown) => Thenable<T>;
  order: (col: string, opts?: unknown) => Thenable<T>;
  select: (...args: unknown[]) => Thenable<T>;
  single: () => Promise<T>;
  maybeSingle: () => Promise<T>;
  insert: (data: unknown) => Thenable<T>;
};

function makeBuilder<T>(result: T): Thenable<T> {
  const thenable = Promise.resolve(result) as Thenable<T>;
  thenable.eq = () => thenable;
  thenable.order = () => thenable;
  thenable.select = () => thenable;
  thenable.insert = () => thenable;
  thenable.single = async () => result;
  thenable.maybeSingle = async () => result;
  return thenable;
}

let fromMock: ReturnType<typeof vi.fn>;
let lettersBuilder: unknown;
let repliesBuilder: unknown;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      fromMock(table);
      if (table === "letters") return lettersBuilder;
      if (table === "replies") return repliesBuilder;
      throw new Error("unknown table: " + table);
    },
  }),
}));

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon");
  fromMock = vi.fn();
});

async function getDriver() {
  vi.resetModules();
  const { createSupabaseDB } = await import("@/lib/db/supabase");
  return createSupabaseDB();
}

describe("supabase driver — listLettersWithReplyCounts", () => {
  it("aggregates reply counts per letter", async () => {
    lettersBuilder = makeBuilder({
      data: [
        { id: "a", slug: "a", dialogue: "", body: "", theme: "dusk", sender_name: "x", created_at: "2026-01-01" },
        { id: "b", slug: "b", dialogue: "", body: "", theme: "dusk", sender_name: "x", created_at: "2026-01-02" },
      ],
      error: null,
    });
    repliesBuilder = makeBuilder({
      data: [{ letter_id: "a" }, { letter_id: "a" }, { letter_id: "b" }],
      error: null,
    });
    const db = await getDriver();
    const list = await db.listLettersWithReplyCounts();
    expect(list).toHaveLength(2);
    expect(list[0].reply_count).toBe(2);
    expect(list[1].reply_count).toBe(1);
  });

  it("treats letters with no replies as count 0", async () => {
    lettersBuilder = makeBuilder({
      data: [{ id: "c", slug: "c", dialogue: "", body: "", theme: "dusk", sender_name: "x", created_at: "2026-01-01" }],
      error: null,
    });
    repliesBuilder = makeBuilder({ data: null, error: null });
    const db = await getDriver();
    const list = await db.listLettersWithReplyCounts();
    expect(list[0].reply_count).toBe(0);
  });

  it("returns empty array when letters data is null", async () => {
    lettersBuilder = makeBuilder({ data: null, error: null });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    expect(await db.listLettersWithReplyCounts()).toEqual([]);
  });

  it("throws on supabase letters error", async () => {
    lettersBuilder = makeBuilder({ data: null, error: { message: "boom" } });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    await expect(db.listLettersWithReplyCounts()).rejects.toThrow("boom");
  });
});

describe("supabase driver — getLetterBySlug", () => {
  it("returns letter row", async () => {
    lettersBuilder = makeBuilder({
      data: { id: "id1", slug: "hello", dialogue: "", body: "", theme: "dusk", sender_name: "x", created_at: "" },
      error: null,
    });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    const letter = await db.getLetterBySlug("hello");
    expect(letter?.id).toBe("id1");
  });

  it("returns null when not found", async () => {
    lettersBuilder = makeBuilder({ data: null, error: null });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    expect(await db.getLetterBySlug("missing")).toBeNull();
  });

  it("throws on error", async () => {
    lettersBuilder = makeBuilder({ data: null, error: { message: "nope" } });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    await expect(db.getLetterBySlug("x")).rejects.toThrow("nope");
  });
});

describe("supabase driver — createLetter", () => {
  it("returns ok with letter on success", async () => {
    lettersBuilder = makeBuilder({
      data: { id: "new", slug: "s", dialogue: "d", body: "b", theme: "dusk", sender_name: "x", created_at: "now" },
      error: null,
    });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    const r = await db.createLetter({ slug: "s", dialogue: "d", body: "b", theme: "dusk", sender_name: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.letter.id).toBe("new");
  });

  it("returns duplicate-slug when error mentions 'duplicate'", async () => {
    lettersBuilder = makeBuilder({ data: null, error: { message: "Duplicate key value" } });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    const r = await db.createLetter({ slug: "s", dialogue: "d", body: "b", theme: "dusk", sender_name: "x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("duplicate-slug");
  });

  it("returns unknown for other errors", async () => {
    lettersBuilder = makeBuilder({ data: null, error: { message: "something else" } });
    repliesBuilder = makeBuilder({ data: [], error: null });
    const db = await getDriver();
    const r = await db.createLetter({ slug: "s", dialogue: "d", body: "b", theme: "dusk", sender_name: "x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("unknown");
    expect(r.message).toBe("something else");
  });
});

describe("supabase driver — getRepliesForLetter", () => {
  it("returns replies array", async () => {
    lettersBuilder = makeBuilder({ data: [], error: null });
    repliesBuilder = makeBuilder({
      data: [{ id: "r1", letter_id: "L", body: "b", reader_name: "n", created_at: "" }],
      error: null,
    });
    const db = await getDriver();
    const replies = await db.getRepliesForLetter("L");
    expect(replies).toHaveLength(1);
  });

  it("returns empty array when data is null", async () => {
    lettersBuilder = makeBuilder({ data: [], error: null });
    repliesBuilder = makeBuilder({ data: null, error: null });
    const db = await getDriver();
    expect(await db.getRepliesForLetter("L")).toEqual([]);
  });

  it("throws on error", async () => {
    lettersBuilder = makeBuilder({ data: [], error: null });
    repliesBuilder = makeBuilder({ data: null, error: { message: "oops" } });
    const db = await getDriver();
    await expect(db.getRepliesForLetter("L")).rejects.toThrow("oops");
  });
});

describe("supabase driver — createReply", () => {
  it("returns inserted reply", async () => {
    lettersBuilder = makeBuilder({ data: [], error: null });
    repliesBuilder = makeBuilder({
      data: { id: "rep", letter_id: "L", body: "b", reader_name: "A", created_at: "now" },
      error: null,
    });
    const db = await getDriver();
    const r = await db.createReply({ letter_id: "L", body: "b", reader_name: "A" });
    expect(r.id).toBe("rep");
  });

  it("throws on error", async () => {
    lettersBuilder = makeBuilder({ data: [], error: null });
    repliesBuilder = makeBuilder({ data: null, error: { message: "fail" } });
    const db = await getDriver();
    await expect(
      db.createReply({ letter_id: "L", body: "b", reader_name: "A" })
    ).rejects.toThrow("fail");
  });
});
