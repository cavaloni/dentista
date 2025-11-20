"use client";

import { formatInTimeZone } from "date-fns-tz";

import type { Broadcast } from "@/app/(protected)/waitlist/shared";

type BroadcastCardProps = {
  broadcast: Broadcast;
  timezone: string;
  onViewDetails: () => void;
};

export function BroadcastCard({
  broadcast,
  timezone,
  onViewDetails,
}: BroadcastCardProps) {
  const statusColors = {
    draft: "bg-slate-500/10 text-slate-200",
    open: "bg-emerald-500/10 text-emerald-200",
    claimed: "bg-cyan-500/10 text-cyan-200",
    booked: "bg-blue-500/10 text-blue-200",
    expired: "bg-rose-500/10 text-rose-200",
    cancelled: "bg-orange-500/10 text-orange-200",
  };

  return (
    <button
      onClick={onViewDetails}
      className="w-full rounded-xl border border-slate-800/70 bg-slate-950/60 p-5 text-left shadow-lg shadow-slate-950/40 transition-all duration-200 hover:scale-[1.02] hover:border-cyan-500/40 hover:bg-slate-950/80 hover:shadow-xl hover:shadow-cyan-500/10"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-200">
            {formatInTimeZone(
              broadcast.start_at,
              timezone,
              "EEE d MMM yyyy • HH:mm"
            )}
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <span>{broadcast.duration_minutes} min</span>
            {broadcast.status !== "draft" && (
              <span>• wave {broadcast.wave_number}</span>
            )}
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                statusColors[broadcast.status]
              }`}
            >
              {broadcast.status}
            </span>
          </p>
        </div>
      </div>

      {broadcast.notes && (
        <p className="mt-3 text-sm text-slate-300/80">{broadcast.notes}</p>
      )}

      <div className="mt-4 flex flex-col gap-1 text-xs text-slate-400">
        <span>
          {broadcast.assigned_count} assigned
          {broadcast.status !== "draft" && (
            <>
              {" "}
              • {broadcast.notified_count} notified • {broadcast.pending_count}{" "}
              pending
            </>
          )}
        </span>
        
        {/* Show winner information for booked broadcasts */}
        {broadcast.status === "booked" && broadcast.winner_name && (
          <span className="text-emerald-400 font-medium">
            🏆 Won by {broadcast.winner_name}
          </span>
        )}
        
        {/* Show cancellation information for cancelled broadcasts */}
        {broadcast.status === "cancelled" && (
          <span className="text-orange-400 font-medium">
            ❌ Cancelled
          </span>
        )}
        
        {/* Show expiration information for expired broadcasts */}
        {broadcast.status === "expired" && (
          <span className="text-rose-400 font-medium">
            ⏰ Expired - no claims received
          </span>
        )}
      </div>
    </button>
  );
}
