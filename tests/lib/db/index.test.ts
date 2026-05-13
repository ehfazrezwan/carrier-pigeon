import { describe, it, expect, vi, beforeEach } from "vitest";

const sqliteStub = { __id: "sqlite" };
const supabaseStub = { __id: "supabase" };

vi.mock("@/lib/db/sqlite", () => ({
  createSqliteDB: () => sqliteStub,
}));

vi.mock("@/lib/db/supabase", () => ({
  createSupabaseDB: () => supabaseStub,
}));

beforeEach(() => {
  (globalThis as unknown as { __cpDb?: unknown }).__cpDb = undefined;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getDB driver picker", () => {
  it("picks sqlite when no env hints are set", async () => {
    const { getDB } = await import("@/lib/db");
    const db = await getDB();
    expect(db).toEqual(sqliteStub);
  });

  it("picks supabase when SUPABASE_URL is set", async () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    const { getDB } = await import("@/lib/db");
    const db = await getDB();
    expect(db).toEqual(supabaseStub);
  });

  it("DB_DRIVER=sqlite overrides SUPABASE_URL", async () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("DB_DRIVER", "sqlite");
    const { getDB } = await import("@/lib/db");
    expect(await getDB()).toEqual(sqliteStub);
  });

  it("DB_DRIVER=supabase forces supabase even without URL", async () => {
    vi.stubEnv("DB_DRIVER", "supabase");
    const { getDB } = await import("@/lib/db");
    expect(await getDB()).toEqual(supabaseStub);
  });

  it("DB_DRIVER with mixed case still works (lowercased)", async () => {
    vi.stubEnv("DB_DRIVER", "SUPABASE");
    const { getDB } = await import("@/lib/db");
    expect(await getDB()).toEqual(supabaseStub);
  });

  it("DB_DRIVER set to invalid value falls back to auto-detect", async () => {
    vi.stubEnv("DB_DRIVER", "redis");
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    const { getDB } = await import("@/lib/db");
    expect(await getDB()).toEqual(supabaseStub);
  });

  it("caches the DB instance across calls", async () => {
    const { getDB } = await import("@/lib/db");
    const a = await getDB();
    const b = await getDB();
    expect(a).toBe(b);
    expect((globalThis as unknown as { __cpDb?: unknown }).__cpDb).toBe(a);
  });
});
