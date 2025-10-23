import Link from "next/link";
import { redirect } from "next/navigation";

import { getAllMembersAction } from "@/app/(protected)/waitlist/actions";
import { AddMemberForm } from "@/components/waitlist/add-member-form";
import { WaitlistClient } from "@/components/waitlist/waitlist-client";
import { ensurePracticeForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WaitlistPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensurePracticeForUser(user.id);
  const members = await getAllMembersAction();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100">Add patient</h2>
          <p className="text-sm text-slate-400">
            Priority is ordered high to low; ties fall back to join date.
          </p>
        </div>
        <AddMemberForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Patient List ({members.length})
          </h2>
          <Link
            href="/waitlist"
            className="text-xs uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            Refresh
          </Link>
        </div>
        <WaitlistClient members={members} />
      </section>
    </div>
  );
}
