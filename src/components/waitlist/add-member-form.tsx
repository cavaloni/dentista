"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";

import {
  createMemberAction,
  initialWaitlistState,
  type WaitlistActionState,
} from "@/app/(protected)/waitlist/actions";

const channels = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add to waitlist"}
    </button>
  );
}

export function AddMemberForm() {
  const [state, formAction] = useFormState<WaitlistActionState, FormData>(
    createMemberAction,
    initialWaitlistState()
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Name</span>
          <input
            name="full_name"
            required
            placeholder="Jane Patient"
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Priority</span>
          <input
            name="priority"
            type="number"
            defaultValue={10}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Channel</span>
          <select
            name="channel"
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          >
            {channels.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Address / number</span>
          <input
            name="address"
            required
            placeholder="whatsapp:+31612345678"
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-slate-200">Notes</span>
        <textarea
          name="notes"
          rows={2}
          placeholder="Preferred hygienist, sedation, etc."
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        />
      </label>
      <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
        <SubmitButton />
        {state.status === "success" && <span className="text-emerald-300">{state.message}</span>}
        {state.status === "error" && <span className="text-rose-300">{state.message}</span>}
      </div>
    </form>
  );
}
