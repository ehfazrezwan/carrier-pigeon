import type { DB } from "./types";

// Cache the DB instance across hot reloads in dev to avoid reconnect churn.
const globalForDb = globalThis as unknown as { __cpDb?: DB };

function pickDriver(): "supabase" | "sqlite" {
  const explicit = (process.env.DB_DRIVER || "").toLowerCase();
  if (explicit === "supabase" || explicit === "sqlite") return explicit;
  // Auto-detect: if SUPABASE_URL is set, use it; otherwise fall back to SQLite.
  if (process.env.SUPABASE_URL) return "supabase";
  return "sqlite";
}

export async function getDB(): Promise<DB> {
  if (globalForDb.__cpDb) return globalForDb.__cpDb;
  const driver = pickDriver();
  if (driver === "supabase") {
    const { createSupabaseDB } = await import("./supabase");
    globalForDb.__cpDb = createSupabaseDB();
  } else {
    const { createSqliteDB } = await import("./sqlite");
    globalForDb.__cpDb = createSqliteDB();
  }
  return globalForDb.__cpDb;
}

export type { DB } from "./types";
