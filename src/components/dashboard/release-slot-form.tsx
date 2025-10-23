"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { releaseSlotAction } from "@/app/(protected)/dashboard/actions";
import {
  releaseSlotInitialState,
  type ReleaseSlotState,
} from "@/app/(protected)/dashboard/types";

type ReleaseSlotFormProps = {
  timezone: string;
  defaultDuration: number;
  defaultStart: string;
  recipientsPerWave: number;
  claimWindowMinutes: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Publishing…" : "Release slot"}
    </button>
  );
}

export function ReleaseSlotForm({
  timezone,
  defaultDuration,
  defaultStart,
  recipientsPerWave,
  claimWindowMinutes,
}: ReleaseSlotFormProps) {
  const [state, formAction] = useActionState<ReleaseSlotState, FormData>(
    releaseSlotAction,
    releaseSlotInitialState
  );
  const [startValue, setStartValue] = useState(defaultStart);

  useEffect(() => {
    setStartValue(defaultStart);
  }, [defaultStart]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="block font-medium text-slate-200">Slot start</span>
          <input
            type="datetime-local"
            name="start_at"
            required
            value={startValue}
            onChange={(event) => setStartValue(event.target.value)}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/50 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
          />
          <span className="block text-xs text-slate-400">
            Times shown in {timezone}.
          </span>
        </label>
        <label className="space-y-2 text-sm">
          <span className="block font-medium text-slate-200">Duration</span>
          <input
            type="number"
            name="duration_minutes"
            required
            defaultValue={defaultDuration}
            min={5}
            step={5}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/50 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
          />
          <span className="block text-xs text-slate-400">
            Minutes per appointment.
          </span>
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span className="block font-medium text-slate-200">Notes</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Cleaning, crown prep, etc."
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/50 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
        />
      </label>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Sends to top {recipientsPerWave} waitlist members.
        </span>
        <span>Claim window: {claimWindowMinutes} min</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <SubmitButton />
        {state.status !== "idle" && (
          <p
            className={`text-sm ${
              state.status === "success"
                ? "text-emerald-300"
                : state.status === "warning"
                ? "text-amber-300"
                : "text-rose-300"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
