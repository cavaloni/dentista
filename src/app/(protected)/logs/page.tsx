import { redirect } from "next/navigation";

import { ensurePracticeForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function truncate(text: string, max = 80) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export default async function LogsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const practiceId = await ensurePracticeForUser(user.id);

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, created_at, direction, status, channel, attempt, error, body, external_message_id, waitlist_members(full_name), slot:slots(start_at), claim:claims(status, wave_number)"
    )
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: claims } = await supabase
    .from("claims")
    .select(
      "id, status, wave_number, notified_at, response_received_at, response_body, waitlist_members(full_name), slot:slots(start_at, status)"
    )
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: webhooks } = await supabase
    .from("webhook_events")
    .select("id, provider, received_at, payload")
    .eq("practice_id", practiceId)
    .order("received_at", { ascending: false })
    .limit(20);

  // Type assertions for complex queries
  const typedMessages = messages as Array<{
    id: string;
    created_at: string;
    direction: "outbound" | "inbound";
    status: "queued" | "sent" | "failed" | "received";
    channel: "whatsapp" | "sms" | "email";
    attempt: number | null;
    error: string | null;
    body: string;
    external_message_id: string | null;
    waitlist_members?: {
      full_name: string;
    } | null;
    slot?: {
      start_at: string;
    } | null;
    claim?: {
      status: "pending" | "won" | "lost" | "expired" | "cancelled";
      wave_number: number;
    } | null;
  }> | null;

  const typedClaims = claims as Array<{
    id: string;
    status: "pending" | "won" | "lost" | "expired" | "cancelled";
    wave_number: number;
    notified_at: string;
    response_received_at: string | null;
    response_body: string | null;
    waitlist_members?: {
      full_name: string;
    } | null;
    slot?: {
      start_at: string;
      status: "open" | "claimed" | "booked" | "expired";
    } | null;
  }> | null;

  const typedWebhooks = webhooks as Array<{
    id: string;
    provider: string;
    received_at: string;
    payload: Record<string, unknown>;
  }> | null;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Message log</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-900/80 text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Attempt</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Excerpt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {typedMessages?.map((message) => (
                <tr key={message.id}>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(message.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {message.direction}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold uppercase tracking-wide ${
                        message.status === "failed"
                          ? "bg-rose-500/10 text-rose-200"
                          : message.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-200"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {message.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {message.attempt ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {message.waitlist_members?.full_name ?? "–"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {truncate(message.body)}
                    {message.error && (
                      <span className="block text-[11px] text-rose-300">
                        {message.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Claim outcomes</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-900/80 text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Slot</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Wave</th>
                <th className="px-4 py-3 text-left">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {typedClaims?.map((claim) => (
                <tr key={claim.id}>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {claim.slot
                      ? new Date(claim.slot.start_at).toLocaleString()
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {claim.waitlist_members?.full_name ?? "–"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {claim.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {claim.wave_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {claim.response_body
                      ? truncate(claim.response_body)
                      : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Webhook traces</h2>
        <div className="space-y-3">
          {typedWebhooks?.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-xs text-slate-300"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium uppercase tracking-wide text-slate-400">
                  {event.provider}
                </span>
                <span className="text-slate-500">
                  {new Date(event.received_at).toLocaleString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-400">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          ))}
          {(!typedWebhooks || typedWebhooks.length === 0) && (
            <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
              No webhook calls logged yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
