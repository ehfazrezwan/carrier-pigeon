import { getDB } from "@/lib/db";

export async function POST(req: Request) {
  const { slug, body, reader_name } = await req.json();
  if (!slug || !body) {
    return Response.json({ error: "Slug and body required" }, { status: 400 });
  }
  if (body.length > 5000) {
    return Response.json({ error: "Reply too long" }, { status: 400 });
  }

  const db = await getDB();
  const letter = await db.getLetterBySlug(slug);
  if (!letter) {
    return Response.json({ error: "Letter not found" }, { status: 404 });
  }

  const reply = await db.createReply({
    letter_id: letter.id,
    body,
    reader_name: reader_name || "Anonymous",
  });
  return Response.json({ reply });
}
