import { getDB } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = await getDB();
  const letter = await db.getLetterBySlug(slug);
  if (!letter) {
    return Response.json({ error: "Letter not found" }, { status: 404 });
  }

  if (await isAuthed()) {
    const replies = await db.getRepliesForLetter(letter.id);
    return Response.json({ letter, replies });
  }
  return Response.json({ letter });
}
