"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateSettingsAction,
  type SettingsState,
} from "@/app/(protected)/settings/actions";

type PracticeSettings = {
  name: string;
  claim_window_minutes: number;
  recipients_per_wave: number;
  default_duration_minutes: number;
  invite_template: string;
  confirmation_template: string;
  taken_template: string;
  demo_mode: boolean | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export function PracticeSettingsForm({
  settings,
}: {
  settings: PracticeSettings;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateSettingsAction,
    { status: "idle" }
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Practice name</span>
          <input
            name="name"
            defaultValue={settings.name}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Claim window (minutes)</span>
          <input
            name="claim_window_minutes"
            type="number"
            min={1}
            max={60}
            defaultValue={settings.claim_window_minutes}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Recipients per wave</span>
          <input
            name="recipients_per_wave"
            type="number"
            min={1}
            max={25}
            defaultValue={settings.recipients_per_wave}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-200">Default duration (minutes)</span>
          <input
            name="default_duration_minutes"
            type="number"
            min={5}
            max={180}
            defaultValue={settings.default_duration_minutes}
            className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          />
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="text-slate-200">Invite template</span>
        <textarea
          name="invite_template"
          rows={3}
          defaultValue={settings.invite_template}
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
        />
        <span className="text-xs text-slate-500">
          Use placeholders: {"{{name}}"}, {"{{slot_start}}"}, {"{{duration}}"}, {"{{claim_window}}"}, {"{{practice}}"}
        </span>
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-slate-200">Winner confirmation template</span>
        <textarea
          name="confirmation_template"
          rows={3}
          defaultValue={settings.confirmation_template}
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-slate-200">Taken / fallback template</span>
        <textarea
          name="taken_template"
          rows={3}
          defaultValue={settings.taken_template}
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/40 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
        />
      </label>

      <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-200">Demo Mode</span>
            <p className="text-xs text-slate-400 mt-1">
              Bypass Twilio and simulate message delivery with automatic responses (~10s delay)
            </p>
          </div>
          <input
            type="checkbox"
            name="demo_mode"
            defaultChecked={settings.demo_mode ?? false}
            className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer"
          />
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <SubmitButton />
        {state.status === "success" && (
          <span className="text-emerald-300">{state.message}</span>
        )}
        {state.status === "error" && (
          <span className="text-rose-300">{state.message}</span>
        )}
      </div>
    </form>
  );
}
