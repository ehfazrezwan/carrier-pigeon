import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { slug, body, reader_name } = await req.json();
  if (!slug || !body) {
    return Response.json({ error: "Slug and body required" }, { status: 400 });
  }
  if (body.length > 5000) {
    return Response.json({ error: "Reply too long" }, { status: 400 });
  }

  const { data: letter, error: letterErr } = await supabase
    .from("letters")
    .select("id")
    .eq("slug", slug)
    .single();
  if (letterErr || !letter) {
    return Response.json({ error: "Letter not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("replies")
    .insert({
      letter_id: letter.id,
      body,
      reader_name: reader_name || "Anonymous",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ reply: data });
}
