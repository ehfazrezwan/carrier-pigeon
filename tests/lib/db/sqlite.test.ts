import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "cp-sqlite-"));
  vi.stubEnv("SQLITE_PATH", join(tmpDir, "test.db"));
  // Bust the cached connection on globalThis between tests
  (globalThis as unknown as { __cpSqlite?: unknown }).__cpSqlite = undefined;
  vi.resetModules();
});

afterEach(() => {
  // Close any open handle by clearing the cache
  const g = globalThis as unknown as { __cpSqlite?: { close: () => void } };
  if (g.__cpSqlite) {
    try {
      g.__cpSqlite.close();
    } catch {
      // ignore
    }
    g.__cpSqlite = undefined;
  }
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

async function fresh() {
  const { createSqliteDB } = await import("@/lib/db/sqlite");
  return createSqliteDB();
}

describe("sqlite driver", () => {
  it("returns empty list when no letters exist", async () => {
    const db = await fresh();
    expect(await db.listLettersWithReplyCounts()).toEqual([]);
  });

  it("returns null for missing slug", async () => {
    const db = await fresh();
    expect(await db.getLetterBySlug("nope")).toBeNull();
  });

  it("creates a letter and reads it back by slug", async () => {
    const db = await fresh();
    const result = await db.createLetter({
      slug: "hello-world",
      dialogue: "Hi",
      body: "Body",
      theme: "dusk",
      sender_name: "Tester",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.letter.slug).toBe("hello-world");
    expect(result.letter.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.letter.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const fetched = await db.getLetterBySlug("hello-world");
    expect(fetched?.body).toBe("Body");
    expect(fetched?.theme).toBe("dusk");
  });

  it("rejects duplicate slug with reason 'duplicate-slug'", async () => {
    const db = await fresh();
    await db.createLetter({
      slug: "dup",
      dialogue: "a",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    const r2 = await db.createLetter({
      slug: "dup",
      dialogue: "a",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) throw new Error("expected fail");
    expect(r2.reason).toBe("duplicate-slug");
  });

  it("returns unknown error reason on non-constraint errors", async () => {
    const db = await fresh();
    // Inject a stub connection that throws a non-constraint error.
    const g = globalThis as unknown as {
      __cpSqlite?: { prepare: (sql: string) => { run: (...a: unknown[]) => void } };
    };
    g.__cpSqlite = {
      prepare: () => ({
        run: () => {
          throw new Error("disk full");
        },
      }),
    };
    const r = await db.createLetter({
      slug: "valid-slug",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected fail");
    expect(r.reason).toBe("unknown");
    expect(r.message).toBe("disk full");
  });

  it("converts non-Error throws to string in unknown reason", async () => {
    const db = await fresh();
    const g = globalThis as unknown as {
      __cpSqlite?: { prepare: (sql: string) => { run: (...a: unknown[]) => void } };
    };
    g.__cpSqlite = {
      prepare: () => ({
        run: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "raw string error";
        },
      }),
    };
    const r = await db.createLetter({
      slug: "x",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected fail");
    expect(r.reason).toBe("unknown");
    expect(r.message).toBe("raw string error");
  });

  it("listLettersWithReplyCounts orders by created_at desc and includes counts", async () => {
    const db = await fresh();
    const a = await db.createLetter({
      slug: "first",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    const b = await db.createLetter({
      slug: "second",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    if (!a.ok || !b.ok) throw new Error("setup");

    await db.createReply({ letter_id: a.letter.id, body: "r1", reader_name: "A" });
    await db.createReply({ letter_id: a.letter.id, body: "r2", reader_name: "B" });

    const list = await db.listLettersWithReplyCounts();
    expect(list).toHaveLength(2);
    // newest first
    expect(list[0].slug).toBe("second");
    expect(list[0].reply_count).toBe(0);
    expect(list[1].slug).toBe("first");
    expect(list[1].reply_count).toBe(2);
  });

  it("getRepliesForLetter returns replies ordered by created_at desc", async () => {
    const db = await fresh();
    const r = await db.createLetter({
      slug: "x",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    if (!r.ok) throw new Error("setup");
    const id = r.letter.id;

    const first = await db.createReply({ letter_id: id, body: "first", reader_name: "A" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await db.createReply({ letter_id: id, body: "second", reader_name: "B" });

    const replies = await db.getRepliesForLetter(id);
    expect(replies).toHaveLength(2);
    expect(replies[0].id).toBe(second.id);
    expect(replies[1].id).toBe(first.id);

    expect(await db.getRepliesForLetter("nonexistent-id")).toEqual([]);
  });

  it("createReply returns the persisted shape", async () => {
    const db = await fresh();
    const l = await db.createLetter({
      slug: "rep",
      dialogue: "d",
      body: "b",
      theme: "dusk",
      sender_name: "x",
    });
    if (!l.ok) throw new Error("setup");
    const rep = await db.createReply({
      letter_id: l.letter.id,
      body: "hello back",
      reader_name: "Reader",
    });
    expect(rep.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rep.body).toBe("hello back");
    expect(rep.reader_name).toBe("Reader");
    expect(rep.letter_id).toBe(l.letter.id);
    expect(rep.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("caches the connection across calls (global)", async () => {
    const db = await fresh();
    await db.listLettersWithReplyCounts();
    const cached = (globalThis as unknown as { __cpSqlite?: unknown }).__cpSqlite;
    expect(cached).toBeTruthy();
    // Second call uses cache
    await db.listLettersWithReplyCounts();
    expect((globalThis as unknown as { __cpSqlite?: unknown }).__cpSqlite).toBe(cached);
  });

  it("uses default path when SQLITE_PATH is not set", async () => {
    vi.unstubAllEnvs();
    (globalThis as unknown as { __cpSqlite?: unknown }).__cpSqlite = undefined;
    const cwd = mkdtempSync(join(tmpdir(), "cp-cwd-"));
    const orig = process.cwd();
    try {
      process.chdir(cwd);
      vi.resetModules();
      const { createSqliteDB } = await import("@/lib/db/sqlite");
      const db = createSqliteDB();
      const list = await db.listLettersWithReplyCounts();
      expect(list).toEqual([]);
    } finally {
      const g = globalThis as unknown as { __cpSqlite?: { close: () => void } };
      try {
        g.__cpSqlite?.close();
      } catch {
        // ignore
      }
      g.__cpSqlite = undefined;
      process.chdir(orig);
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
