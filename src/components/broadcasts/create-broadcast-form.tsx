"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useActionState } from "react";

import { createBroadcastAction } from "@/app/(protected)/broadcasts/actions";
import { initialBroadcastState } from "@/app/(protected)/waitlist/shared";

type CreateBroadcastFormProps = {
  timezone: string;
  defaultDuration: number;
};

export function CreateBroadcastForm({
  timezone,
  defaultDuration,
}: CreateBroadcastFormProps) {
  const [state, formAction, isPending] = useActionState(
    createBroadcastAction,
    initialBroadcastState()
  );

  const defaultStart = formatInTimeZone(
    Date.now() + 30 * 60 * 1000,
    timezone,
    "yyyy-MM-dd'T'HH:mm"
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="start_at"
            className="mb-1.5 block text-sm font-medium text-slate-200"
          >
            Start Time
          </label>
          <input
            type="datetime-local"
            id="start_at"
            name="start_at"
            defaultValue={defaultStart}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label
            htmlFor="duration_minutes"
            className="mb-1.5 block text-sm font-medium text-slate-200"
          >
            Duration (minutes)
          </label>
          <input
            type="number"
            id="duration_minutes"
            name="duration_minutes"
            defaultValue={defaultDuration}
            min="5"
            max="240"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-slate-200"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Internal notes about this time slot..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {state.status === "error" && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Creating..." : "Create Draft Broadcast"}
      </button>
    </form>
  );
}
