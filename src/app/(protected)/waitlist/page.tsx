import Link from "next/link";
import { redirect } from "next/navigation";

import { AddMemberForm } from "@/components/waitlist/add-member-form";
import { MemberRow } from "@/components/waitlist/member-row";
import { ensurePracticeForUser } from "@/lib/practice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

type SearchParams = {
  page?: string;
};

const PAGE_SIZE = 20;

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const practiceId = await ensurePracticeForUser(session.user.id);
  const page = Math.max(
    1,
    Number.parseInt(resolvedSearchParams?.page ?? "1", 10)
  );
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: members, count } = await supabase
    .from("waitlist_members")
    .select(
      "id, full_name, channel, address, priority, active, notes, last_notified_at",
      { count: "exact" }
    )
    .eq("practice_id", practiceId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  // Type assertion for complex query
  const typedMembers = members as Array<{
    id: string;
    full_name: string;
    channel: "whatsapp" | "sms" | "email";
    address: string;
    priority: number;
    active: boolean;
    notes: string | null;
    last_notified_at: string | null;
  }> | null;

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
            Waitlist ({count ?? 0})
          </h2>
          <Link
            href="/waitlist?page=1"
            className="text-xs uppercase tracking-wide text-slate-500 hover:text-cyan-200"
          >
            Refresh
          </Link>
        </div>
        <div className="space-y-3">
          {typedMembers && typedMembers.length > 0 ? (
            typedMembers.map((member) => <MemberRow key={member.id} member={member} />)
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/50 p-8 text-center text-sm text-slate-400">
              No waitlist members yet.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={`/waitlist?page=${Math.max(1, page - 1)}`}
                className={`rounded-md border border-slate-800/70 px-3 py-1 ${
                  page === 1
                    ? "pointer-events-none opacity-40"
                    : "hover:border-cyan-400 hover:text-cyan-200"
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/waitlist?page=${Math.min(totalPages, page + 1)}`}
                className={`rounded-md border border-slate-800/70 px-3 py-1 ${
                  page === totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:border-cyan-400 hover:text-cyan-200"
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
