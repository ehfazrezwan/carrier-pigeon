import { isAuthed } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { generateSlug, slugify, SLUG_PATTERN } from "@/lib/slugs";

export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDB();
  const letters = await db.listLettersWithReplyCounts();
  return Response.json({ letters });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dialogue, body, theme, sender_name, slug: rawSlug } = await req.json();
  if (!dialogue || !body) {
    return Response.json({ error: "Dialogue and body required" }, { status: 400 });
  }
  const db = await getDB();
  const baseInput = {
    dialogue,
    body,
    theme: theme || "dusk",
    sender_name: sender_name || "The Carrier",
  };

  // Custom slug path.
  if (rawSlug && typeof rawSlug === "string" && rawSlug.trim()) {
    const slug = slugify(rawSlug);
    if (!SLUG_PATTERN.test(slug)) {
      return Response.json(
        { error: "Slug must be 3–60 chars, lowercase letters/numbers/hyphens, not starting or ending with a hyphen." },
        { status: 400 }
      );
    }
    const result = await db.createLetter({ slug, ...baseInput });
    if (!result.ok) {
      if (result.reason === "duplicate-slug") {
        return Response.json({ error: "That slug is already taken." }, { status: 409 });
      }
      return Response.json({ error: result.message || "Could not save letter." }, { status: 500 });
    }
    return Response.json({ letter: result.letter });
  }

  // Auto-slug path with retry on collision.
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug();
    const result = await db.createLetter({ slug, ...baseInput });
    if (result.ok) return Response.json({ letter: result.letter });
    if (result.reason !== "duplicate-slug") {
      return Response.json({ error: result.message || "Could not save letter." }, { status: 500 });
    }
  }
  return Response.json({ error: "Could not generate unique slug" }, { status: 500 });
}
