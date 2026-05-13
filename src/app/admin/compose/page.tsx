import { requireAuth } from "@/lib/auth";
import ComposeForm from "./ComposeForm";

export default async function ComposePage() {
  await requireAuth();
  return <ComposeForm />;
}
