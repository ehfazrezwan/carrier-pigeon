import { createClient } from "@supabase/supabase-js";
import type { DB, NewLetter, NewReply, CreateLetterResult } from "./types";
import type { Letter, Reply, LetterWithReplyCount } from "@/lib/types";

export function createSupabaseDB(): DB {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  return {
    async listLettersWithReplyCounts(): Promise<LetterWithReplyCount[]> {
      const { data: letters, error } = await supabase
        .from("letters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const { data: replyCounts } = await supabase
        .from("replies")
        .select("letter_id");

      const counts: Record<string, number> = {};
      (replyCounts || []).forEach((r: { letter_id: string }) => {
        counts[r.letter_id] = (counts[r.letter_id] || 0) + 1;
      });

      return (letters || []).map((l) => ({
        ...l,
        reply_count: counts[l.id] || 0,
      }));
    },

    async getLetterBySlug(slug: string): Promise<Letter | null> {
      const { data, error } = await supabase
        .from("letters")
        .select("*")
        .eq("slug", slug)
        .maybeSingle<Letter>();
      if (error) throw new Error(error.message);
      return data;
    },

    async createLetter(input: NewLetter): Promise<CreateLetterResult> {
      const { data, error } = await supabase
        .from("letters")
        .insert(input)
        .select()
        .single();
      if (error) {
        if (error.message.toLowerCase().includes("duplicate")) {
          return { ok: false, reason: "duplicate-slug" };
        }
        return { ok: false, reason: "unknown", message: error.message };
      }
      return { ok: true, letter: data as Letter };
    },

    async getRepliesForLetter(letterId: string): Promise<Reply[]> {
      const { data, error } = await supabase
        .from("replies")
        .select("*")
        .eq("letter_id", letterId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as Reply[];
    },

    async createReply(input: NewReply): Promise<Reply> {
      const { data, error } = await supabase
        .from("replies")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Reply;
    },
  };
}
