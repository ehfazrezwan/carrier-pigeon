import { isAuthed } from "@/lib/auth";
import PasswordGate from "./PasswordGate";
import LetterList from "./LetterList";

export default async function AdminPage() {
  const authed = await isAuthed();
  return authed ? <LetterList /> : <PasswordGate />;
}
