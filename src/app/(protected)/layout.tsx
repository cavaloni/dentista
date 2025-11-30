import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { SessionTimeout } from "@/components/auth/session-timeout";
import {
  PracticeProvider,
  type PracticeContextValue,
} from "@/components/practice-context";
import { NavLinks } from "@/components/nav-links";
import { NotificationWrapper } from "@/components/notifications/notification-wrapper";
import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

const navItems = [
  { href: "/broadcasts", label: "Broadcasts" },
  { href: "/waitlist", label: "Patient List" },
  { href: "/settings", label: "Settings" },
  { href: "/logs", label: "Activity" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensureCompanyForUser(user.id);

  const { data: company, error } = await supabase
    .from("companies")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes"
    )
    .eq("id", companyId)
    .single();

  if (error || !company) {
    throw error ?? new Error("Company not found");
  }

  // Type assertion to help TypeScript understand the type
  const typedCompany = company as Database["public"]["Tables"]["companies"]["Row"];

  const practiceContext: PracticeContextValue = {
    id: typedCompany.id,
    name: typedCompany.name,
    timezone: typedCompany.timezone,
    claimWindowMinutes: typedCompany.claim_window_minutes,
    recipientsPerWave: typedCompany.recipients_per_wave,
    defaultDurationMinutes: typedCompany.default_duration_minutes,
  };

  return (
    <PracticeProvider value={practiceContext}>
      <NotificationWrapper>
        <SessionTimeout timeoutMinutes={30} warningMinutes={5} />
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="w-full border-b border-slate-200 bg-white/70 px-6 py-6 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70 md:w-72 md:border-r md:border-b-0">
            <div className="space-y-6">
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {typedCompany.name}
                </h1>
                <p className="text-xs uppercase tracking-wide text-cyan-600 dark:text-cyan-300/80">
                  Gap Filler Console
                </p>
              </div>
              <NavLinks items={navItems} />
              <div className="pt-6">
                <LogoutButton />
              </div>
            </div>
          </aside>
          <main className="flex-1 px-6 py-10">
            <div className="mx-auto w-full max-w-6xl space-y-8">
              {children}
            </div>
          </main>
        </div>
      </NotificationWrapper>
    </PracticeProvider>
  );
}
