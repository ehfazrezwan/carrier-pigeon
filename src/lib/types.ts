export type Theme = "day" | "dusk" | "dawn" | "night";

export interface Letter {
  id: string;
  slug: string;
  dialogue: string;
  body: string;
  theme: Theme;
  sender_name: string;
  created_at: string;
}

export interface Reply {
  id: string;
  letter_id: string;
  body: string;
  reader_name: string;
  created_at: string;
}

export interface LetterWithReplyCount extends Letter {
  reply_count: number;
}
