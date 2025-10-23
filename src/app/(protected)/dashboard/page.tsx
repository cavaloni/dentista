import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { Countdown } from "@/components/dashboard/countdown";
import { ReleaseSlotForm } from "@/components/dashboard/release-slot-form";
import { ResendButton } from "@/components/dashboard/resend-button";
import { CancelButton } from "@/components/dashboard/cancel-button";
import { ensureCompanyForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

export default async function DashboardPage() {
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
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes"
    )
    .eq("id", companyId)
    .single();

  if (!company) {
    throw new Error("Company not found");
  }

  // Type assertion to help TypeScript understand the type
  const typedCompany = company as Database["public"]["Tables"]["companies"]["Row"];

  const defaultStart = formatInTimeZone(
    Date.now() + 30 * 60 * 1000,
    typedCompany.timezone,
    "yyyy-MM-dd'T'HH:mm"
  );

  const { data: activeSlots } = await supabase
    .from("slots")
    .select(
      "id, start_at, duration_minutes, notes, status, expires_at, wave_number, claim_window_minutes, claims(id, status, wave_number, waitlist_members(full_name, channel))"
    )
    .eq("company_id", typedCompany.id)
    .in("status", ["open", "claimed", "expired"])
    .order("expires_at", { ascending: true })
    .limit(10);

  const { data: recentMessages } = await supabase
    .from("messages")
    .select(
      "id, created_at, direction, status, channel, body, waitlist_members(full_name), slot:slots(start_at), claim:claims(status, wave_number)"
    )
    .eq("company_id", typedCompany.id)
    .order("created_at", { ascending: false })
    .limit(12);

  // Type assertions for complex queries
  const typedActiveSlots = activeSlots as Array<{
    id: string;
    start_at: string;
    duration_minutes: number;
    notes: string | null;
    status: "open" | "claimed" | "booked" | "expired" | "cancelled";
    expires_at: string;
    wave_number: number;
    claim_window_minutes: number;
    claims?: Array<{
      id: string;
      status: "pending" | "won" | "lost" | "expired" | "cancelled";
      wave_number: number;
      waitlist_members?: {
        full_name: string;
      } | null;
    }> | null;
  }> | null;

  const typedRecentMessages = recentMessages as Array<{
    id: string;
    created_at: string;
    direction: "outbound" | "inbound";
    status: "queued" | "sent" | "failed" | "received";
    channel: "whatsapp" | "sms" | "email";
    body: string;
    waitlist_members?: {
      full_name: string;
    } | null;
  }> | null;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Release a gap
            </h2>
            <p className="text-sm text-slate-400">
              Broadcast to the next cohort instantly.
            </p>
          </div>
        </div>
        <ReleaseSlotForm
          timezone={typedCompany.timezone}
          defaultDuration={typedCompany.default_duration_minutes}
          defaultStart={defaultStart}
          recipientsPerWave={typedCompany.recipients_per_wave}
          claimWindowMinutes={typedCompany.claim_window_minutes}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Active broadcasts</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Claim window: {typedCompany.claim_window_minutes} min
          </span>
        </div>
        {typedActiveSlots && typedActiveSlots.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {typedActiveSlots.map((slot) => {
              const recipientCount = slot.claims?.length ?? 0;
              const pending = slot.claims?.filter(
                (claim) => claim.status === "pending"
              ).length;
              const claimed = slot.claims?.find(
                (claim) => claim.status === "won"
              );

              return (
                <div
                  key={slot.id}
                  className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-cyan-200">
                        {formatInTimeZone(
                          slot.start_at,
                          typedCompany.timezone,
                          "EEE d MMM yyyy • HH:mm"
                        )}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{slot.duration_minutes} min • wave {slot.wave_number}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            slot.status === "open"
                              ? "bg-emerald-500/10 text-emerald-200"
                              : slot.status === "claimed"
                              ? "bg-cyan-500/10 text-cyan-200"
                              : "bg-rose-500/10 text-rose-200"
                          }`}
                        >
                          {slot.status}
                        </span>
                      </p>
                    </div>
                    <Countdown expiresAt={slot.expires_at} />
                  </div>
                  {slot.notes && (
                    <p className="mt-3 text-sm text-slate-300/80">
                      {slot.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-start sm:justify-between">
                    <span className="sm:pt-1">
                      {recipientCount} notified · {pending ?? 0} waiting
                    </span>
                    {slot.status === "open" && (
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <ResendButton slotId={slot.id} />
                        <CancelButton slotId={slot.id} />
                      </div>
                    )}
                  </div>
                  {claimed && (
                    <p className="mt-3 text-sm text-emerald-300">
                      Claimed by {claimed.waitlist_members?.full_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
            No active broadcasts. Release a slot to get started.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Recent activity</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Last {typedRecentMessages?.length ?? 0} events
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800/80 text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Excerpt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {typedRecentMessages?.map((message) => (
                <tr key={message.id}>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatInTimeZone(
                      message.created_at,
                      typedCompany.timezone,
                      "d MMM • HH:mm"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-200">
                    {message.direction === "outbound" ? "Outbound" : "Inbound"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {message.waitlist_members?.full_name ?? "–"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 uppercase">
                    {message.channel}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {message.body.length > 80
                      ? `${message.body.slice(0, 77)}…`
                      : message.body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
