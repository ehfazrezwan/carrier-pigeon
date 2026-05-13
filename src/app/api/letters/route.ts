import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { generateSlug, slugify, SLUG_PATTERN } from "@/lib/slugs";

export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: letters, error } = await supabase
    .from("letters")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: replyCounts } = await supabase
    .from("replies")
    .select("letter_id");

  const counts: Record<string, number> = {};
  (replyCounts || []).forEach((r: { letter_id: string }) => {
    counts[r.letter_id] = (counts[r.letter_id] || 0) + 1;
  });

  const withCounts = (letters || []).map((l) => ({
    ...l,
    reply_count: counts[l.id] || 0,
  }));

  return Response.json({ letters: withCounts });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dialogue, body, theme, sender_name, slug: rawSlug } = await req.json();
  if (!dialogue || !body) {
    return Response.json({ error: "Dialogue and body required" }, { status: 400 });
  }

  // If the admin supplied a slug, validate it and use it directly (no retry).
  if (rawSlug && typeof rawSlug === "string" && rawSlug.trim()) {
    const slug = slugify(rawSlug);
    if (!SLUG_PATTERN.test(slug)) {
      return Response.json(
        { error: "Slug must be 3–60 chars, lowercase letters/numbers/hyphens, not starting or ending with a hyphen." },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("letters")
      .insert({
        slug,
        dialogue,
        body,
        theme: theme || "dusk",
        sender_name: sender_name || "The Carrier",
      })
      .select()
      .single();
    if (error) {
      if (error.message.includes("duplicate")) {
        return Response.json({ error: "That slug is already taken." }, { status: 409 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ letter: data });
  }

  // Otherwise auto-generate, retrying on collision.
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug();
    const { data, error } = await supabase
      .from("letters")
      .insert({
        slug,
        dialogue,
        body,
        theme: theme || "dusk",
        sender_name: sender_name || "The Carrier",
      })
      .select()
      .single();
    if (!error && data) return Response.json({ letter: data });
    if (error && !error.message.includes("duplicate")) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  return Response.json({ error: "Could not generate unique slug" }, { status: 500 });
}
