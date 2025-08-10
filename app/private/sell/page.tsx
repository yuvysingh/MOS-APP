// app/sell/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server"; // your server helper
import TicketUploader from "@/app/components/ImageUploader";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sell a Ticket</h1>
      <TicketUploader userId={user.id} />
    </main>
  );
}
