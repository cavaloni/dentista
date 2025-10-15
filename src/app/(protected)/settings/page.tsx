import { redirect } from "next/navigation";

import { PracticeSettingsForm } from "@/components/settings/practice-settings-form";
import { ensurePracticeForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const practiceId = await ensurePracticeForUser(session.user.id);

  const { data: practice } = await supabase
    .from("practices")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes, invite_template, confirmation_template, taken_template"
    )
    .eq("id", practiceId)
    .single();

  if (!practice) {
    throw new Error("Practice settings not found");
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Practice defaults
          </h2>
          <p className="text-sm text-slate-400">
            Control how slots are offered and what patients receive.
          </p>
        </div>
        <PracticeSettingsForm settings={practice} />
      </section>
    </div>
  );
}
