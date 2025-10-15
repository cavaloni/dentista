import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  PracticeProvider,
  type PracticeContextValue,
} from "@/components/practice-context";
import { NavLinks } from "@/components/nav-links";
import { ensurePracticeForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/waitlist", label: "Waitlist" },
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const practiceId = await ensurePracticeForUser(session.user.id);

  const { data: practice, error } = await supabase
    .from("practices")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes"
    )
    .eq("id", practiceId)
    .single();

  if (error || !practice) {
    throw error ?? new Error("Practice not found");
  }

  // Type assertion to help TypeScript understand the type
  const typedPractice = practice as Database["public"]["Tables"]["practices"]["Row"];

  const practiceContext: PracticeContextValue = {
    id: typedPractice.id,
    name: typedPractice.name,
    timezone: typedPractice.timezone,
    claimWindowMinutes: typedPractice.claim_window_minutes,
    recipientsPerWave: typedPractice.recipients_per_wave,
    defaultDurationMinutes: typedPractice.default_duration_minutes,
  };

  return (
    <PracticeProvider value={practiceContext}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-slate-800/70 bg-slate-950/70 px-6 py-6 backdrop-blur md:w-72 md:border-r md:border-b-0">
          <div className="space-y-6">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                {typedPractice.name}
              </h1>
              <p className="text-xs uppercase tracking-wide text-cyan-300/80">
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
    </PracticeProvider>
  );
}
