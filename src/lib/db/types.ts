import type { Letter, Reply, LetterWithReplyCount } from "@/lib/types";

export interface NewLetter {
  slug: string;
  dialogue: string;
  body: string;
  theme: string;
  sender_name: string;
}

export interface NewReply {
  letter_id: string;
  body: string;
  reader_name: string;
}

export type CreateLetterResult =
  | { ok: true; letter: Letter }
  | { ok: false; reason: "duplicate-slug" | "unknown"; message?: string };

export interface DB {
  listLettersWithReplyCounts(): Promise<LetterWithReplyCount[]>;
  getLetterBySlug(slug: string): Promise<Letter | null>;
  createLetter(input: NewLetter): Promise<CreateLetterResult>;
  getRepliesForLetter(letterId: string): Promise<Reply[]>;
  createReply(input: NewReply): Promise<Reply>;
}
