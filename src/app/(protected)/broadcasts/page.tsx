import { redirect } from "next/navigation";

import { getAllBroadcastsAction } from "@/app/(protected)/broadcasts/actions";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { CreateBroadcastForm } from "@/components/broadcasts/create-broadcast-form";
import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BroadcastsPage() {
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
    .select("id, name, timezone, claim_window_minutes, default_duration_minutes, demo_mode")
    .eq("id", companyId)
    .single();

  if (!company) {
    throw new Error("Company not found");
  }

  const broadcasts = await getAllBroadcastsAction();

  return (
    <div className="space-y-10">
      {company.demo_mode && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4 shadow-lg dark:border-amber-500/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <svg
                className="h-6 w-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-200">
                Demo Mode Active
              </h3>
              <p className="text-xs text-amber-300/80">
                Messages are being simulated. No real SMS/WhatsApp messages will be sent. Mock responses arrive in ~10 seconds.
              </p>
            </div>
          </div>
        </div>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-slate-950/40">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create Broadcast
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create a draft broadcast, assign patients, then start when ready.
          </p>
        </div>
        <CreateBroadcastForm
          timezone={company.timezone}
          defaultDuration={company.default_duration_minutes}
        />
      </section>

      <BroadcastList
        broadcasts={broadcasts}
        timezone={company.timezone}
        claimWindowMinutes={company.claim_window_minutes}
      />
    </div>
  );
}
