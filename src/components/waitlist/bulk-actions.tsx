"use client";

import { Trash2, Users, Power } from "lucide-react";

type BulkActionsProps = {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  disabled?: boolean;
};

export function BulkActions({
  selectedCount,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  disabled = false,
}: BulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-200">
            {selectedCount} {selectedCount === 1 ? "member" : "members"} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBulkActivate}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Power className="h-3.5 w-3.5" />
            Activate
          </button>

          <button
            onClick={onBulkDeactivate}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Power className="h-3.5 w-3.5" />
            Deactivate
          </button>

          <button
            onClick={onBulkDelete}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md border border-rose-600/50 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
