"use client";

import { useFormState, useFormStatus } from "react-dom";

import { resendNextWaveAction } from "@/app/(protected)/dashboard/actions";
import {
  releaseSlotInitialState,
  type ReleaseSlotState,
} from "@/app/(protected)/dashboard/types";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md border border-slate-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Resend to next"}
    </button>
  );
}

export function ResendButton({ slotId }: { slotId: string }) {
  const [state, formAction] = useFormState<ReleaseSlotState, FormData>(
    resendNextWaveAction,
    releaseSlotInitialState
  );

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="slot_id" value={slotId} />
      <Submit />
      {state.status !== "idle" && (
        <p
          className={`text-[11px] ${
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
    </form>
  );
}
