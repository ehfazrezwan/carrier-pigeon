import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Letter } from "@/lib/types";
import CarrierPigeon from "@/app/CarrierPigeon";

export default async function LetterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: letter, error } = await supabase
    .from("letters")
    .select("*")
    .eq("slug", slug)
    .single<Letter>();

  if (error || !letter) notFound();

  return (
    <CarrierPigeon
      dialogue={letter.dialogue}
      letter={letter.body}
      theme={letter.theme}
      senderName={letter.sender_name}
      slug={letter.slug}
    />
  );
}

export const dynamic = "force-dynamic";
