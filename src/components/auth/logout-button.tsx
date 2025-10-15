"use client";

import { useFormStatus } from "react-dom";

import { signOut } from "@/app/actions/logout";

function ButtonInner() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-500/80 hover:bg-slate-800/80 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={signOut} className="w-full">
      <ButtonInner />
    </form>
  );
}
