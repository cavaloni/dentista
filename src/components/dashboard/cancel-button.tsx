"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { cancelSlotAction } from "@/app/(protected)/dashboard/actions";
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
      className="inline-flex items-center justify-center rounded-md border border-rose-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Cancelling…" : "Cancel broadcast"}
    </button>
  );
}

export function CancelButton({ slotId }: { slotId: string }) {
  const [state, formAction] = useActionState<ReleaseSlotState, FormData>(
    cancelSlotAction,
    releaseSlotInitialState
  );

  return (
    <form
      action={formAction}
      className="space-y-1"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Are you sure you want to cancel this broadcast?"
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
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
