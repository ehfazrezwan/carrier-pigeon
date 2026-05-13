import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { data: letter, error } = await supabase
    .from("letters")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !letter) {
    return Response.json({ error: "Letter not found" }, { status: 404 });
  }

  // Admins also get replies
  if (await isAuthed()) {
    const { data: replies } = await supabase
      .from("replies")
      .select("*")
      .eq("letter_id", letter.id)
      .order("created_at", { ascending: false });
    return Response.json({ letter, replies: replies || [] });
  }

  return Response.json({ letter });
}
