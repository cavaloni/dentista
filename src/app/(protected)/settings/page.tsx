import { redirect } from "next/navigation";

import { PracticeSettingsForm } from "@/components/settings/practice-settings-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensureCompanyForUser(user.id);

  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes, invite_template, confirmation_template, taken_template, demo_mode"
    )
    .eq("id", companyId)
    .single();

  if (!company) {
    throw new Error("Company settings not found");
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-slate-950/40">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Appearance
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Customize the look and feel of the application.
          </p>
        </div>
        <ThemeToggle />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-slate-950/40">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Practice defaults
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Control how slots are offered and what patients receive.
          </p>
        </div>
        <PracticeSettingsForm settings={company} />
      </section>

      <NotificationSettings />
    </div>
  );
}
