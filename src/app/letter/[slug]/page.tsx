import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import CarrierPigeon from "@/app/CarrierPigeon";

export default async function LetterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDB();
  const letter = await db.getLetterBySlug(slug);
  if (!letter) notFound();

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
