import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { randomUUID } from "crypto";
import type { DB, NewLetter, NewReply, CreateLetterResult } from "./types";
import type { Letter, Reply, LetterWithReplyCount, Theme } from "@/lib/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS letters (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  dialogue    TEXT NOT NULL,
  body        TEXT NOT NULL,
  theme       TEXT NOT NULL DEFAULT 'dusk',
  sender_name TEXT NOT NULL DEFAULT 'The Carrier',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_letters_slug ON letters(slug);

CREATE TABLE IF NOT EXISTS replies (
  id          TEXT PRIMARY KEY,
  letter_id   TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  reader_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_replies_letter_id ON replies(letter_id);
`;

// Cache the DB connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __cpSqlite?: Database.Database };

function getConnection(): Database.Database {
  if (globalForDb.__cpSqlite) return globalForDb.__cpSqlite;
  const path = resolve(process.cwd(), process.env.SQLITE_PATH || "./data/carrier-pigeon.db");
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  globalForDb.__cpSqlite = db;
  return db;
}

function isoNow(): string {
  return new Date().toISOString();
}

function rowToLetter(row: Record<string, unknown>): Letter {
  return {
    id: row.id as string,
    slug: row.slug as string,
    dialogue: row.dialogue as string,
    body: row.body as string,
    theme: row.theme as Theme,
    sender_name: row.sender_name as string,
    created_at: row.created_at as string,
  };
}

function rowToReply(row: Record<string, unknown>): Reply {
  return {
    id: row.id as string,
    letter_id: row.letter_id as string,
    body: row.body as string,
    reader_name: row.reader_name as string,
    created_at: row.created_at as string,
  };
}

export function createSqliteDB(): DB {
  return {
    async listLettersWithReplyCounts(): Promise<LetterWithReplyCount[]> {
      const db = getConnection();
      const rows = db
        .prepare(
          `SELECT l.*, COALESCE(c.cnt, 0) AS reply_count
             FROM letters l
             LEFT JOIN (SELECT letter_id, COUNT(*) AS cnt FROM replies GROUP BY letter_id) c
               ON c.letter_id = l.id
             ORDER BY l.created_at DESC`
        )
        .all() as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        ...rowToLetter(r),
        reply_count: Number(r.reply_count) || 0,
      }));
    },

    async getLetterBySlug(slug: string): Promise<Letter | null> {
      const db = getConnection();
      const row = db
        .prepare(`SELECT * FROM letters WHERE slug = ?`)
        .get(slug) as Record<string, unknown> | undefined;
      return row ? rowToLetter(row) : null;
    },

    async createLetter(input: NewLetter): Promise<CreateLetterResult> {
      const db = getConnection();
      const id = randomUUID();
      const created_at = isoNow();
      try {
        db.prepare(
          `INSERT INTO letters (id, slug, dialogue, body, theme, sender_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          input.slug,
          input.dialogue,
          input.body,
          input.theme,
          input.sender_name,
          created_at
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("UNIQUE") || msg.toLowerCase().includes("constraint")) {
          return { ok: false, reason: "duplicate-slug" };
        }
        return { ok: false, reason: "unknown", message: msg };
      }
      return {
        ok: true,
        letter: {
          id,
          slug: input.slug,
          dialogue: input.dialogue,
          body: input.body,
          theme: input.theme as Theme,
          sender_name: input.sender_name,
          created_at,
        },
      };
    },

    async getRepliesForLetter(letterId: string): Promise<Reply[]> {
      const db = getConnection();
      const rows = db
        .prepare(`SELECT * FROM replies WHERE letter_id = ? ORDER BY created_at DESC`)
        .all(letterId) as Array<Record<string, unknown>>;
      return rows.map(rowToReply);
    },

    async createReply(input: NewReply): Promise<Reply> {
      const db = getConnection();
      const id = randomUUID();
      const created_at = isoNow();
      db.prepare(
        `INSERT INTO replies (id, letter_id, body, reader_name, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, input.letter_id, input.body, input.reader_name, created_at);
      return {
        id,
        letter_id: input.letter_id,
        body: input.body,
        reader_name: input.reader_name,
        created_at,
      };
    },
  };
}
