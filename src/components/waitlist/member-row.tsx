"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  deleteMemberAction,
  initialWaitlistState,
  toggleMemberAction,
  updateMemberAction,
  type WaitlistActionState,
} from "@/app/(protected)/waitlist/actions";

type Member = {
  id: string;
  full_name: string;
  channel: "whatsapp" | "sms" | "email";
  address: string;
  priority: number;
  active: boolean;
  notes: string | null;
  last_notified_at: string | null;
};

const channels = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function MemberRow({ member }: { member: Member }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState<WaitlistActionState, FormData>(
    updateMemberAction,
    initialWaitlistState()
  );

  useEffect(() => {
    if (state.status === "success") {
      setEditing(false);
    }
  }, [state.status]);

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 shadow shadow-slate-950/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 text-sm">
          {editing ? (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="id" value={member.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  <span>Name</span>
                  <input
                    name="full_name"
                    defaultValue={member.full_name}
                    className="w-full rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                    required
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  <span>Priority</span>
                  <input
                    name="priority"
                    type="number"
                    defaultValue={member.priority}
                    className="w-full rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  <span>Channel</span>
                  <select
                    name="channel"
                    defaultValue={member.channel}
                    className="w-full rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                  >
                    {channels.map((channel) => (
                      <option key={channel.value} value={channel.value}>
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  <span>Address</span>
                  <input
                    name="address"
                    defaultValue={member.address}
                    className="w-full rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                    required
                  />
                </label>
              </div>
              <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                <span>Notes</span>
                <textarea
                  name="notes"
                  defaultValue={member.notes ?? ""}
                  rows={2}
                  className="w-full rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                />
              </label>
              <div className="flex items-center gap-3">
                <SaveButton />
                <button
                  type="button"
                  className="text-xs uppercase tracking-wide text-slate-400 hover:text-slate-200"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                {state.status === "error" && (
                  <span className="text-xs text-rose-300">{state.message}</span>
                )}
                {state.status === "success" && (
                  <span className="text-xs text-emerald-300">Saved</span>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  {member.full_name}
                </h3>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    member.active
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {member.active ? "Active" : "Paused"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {member.channel.toUpperCase()} · {member.address}
              </p>
              <p className="text-xs text-slate-400">Priority {member.priority}</p>
              {member.notes && (
                <p className="text-xs text-slate-300/80">{member.notes}</p>
              )}
              {member.last_notified_at && (
                <p className="text-[11px] text-slate-500">
                  Last notified {new Date(member.last_notified_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-400 md:items-end">
          {!editing && (
            <button
              type="button"
              className="rounded-md border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              onClick={() => setEditing(true)}
            >
              Edit member
            </button>
          )}
          <form action={toggleMemberAction}>
            <input type="hidden" name="id" value={member.id} />
            <input
              type="hidden"
              name="active"
              value={member.active ? "false" : "true"}
            />
            <button
              type="submit"
              className="rounded-md border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-200"
            >
              {member.active ? "Deactivate" : "Activate"}
            </button>
          </form>
          <form action={deleteMemberAction}>
            <input type="hidden" name="id" value={member.id} />
            <button
              type="submit"
              className="rounded-md border border-rose-600/50 px-3 py-1 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
            >
              Remove
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
