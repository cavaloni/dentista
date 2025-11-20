"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useState } from "react";

import type { Broadcast } from "@/app/(protected)/waitlist/shared";
import { BroadcastCard } from "./broadcast-card";
import { BroadcastDetailModal } from "./broadcast-detail-modal";

type BroadcastListProps = {
  broadcasts: Broadcast[];
  timezone: string;
  claimWindowMinutes: number;
};

export function BroadcastList({
  broadcasts,
  timezone,
  claimWindowMinutes,
}: BroadcastListProps) {
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(
    null
  );
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const draftBroadcasts = broadcasts.filter((b) => b.status === "draft");
  const activeBroadcasts = broadcasts.filter((b) =>
    ["open", "claimed"].includes(b.status)
  );
  const completedBroadcasts = broadcasts.filter((b) =>
    ["booked", "expired", "cancelled"].includes(b.status)
  );

  const displayedCompletedBroadcasts = showAllCompleted 
    ? completedBroadcasts 
    : completedBroadcasts.slice(0, 4);

  return (
    <>
      {draftBroadcasts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Draft Broadcasts
            </h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {draftBroadcasts.length} draft{draftBroadcasts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {draftBroadcasts.map((broadcast) => (
              <BroadcastCard
                key={broadcast.id}
                broadcast={broadcast}
                timezone={timezone}
                onViewDetails={() => setSelectedBroadcastId(broadcast.id)}
              />
            ))}
          </div>
        </section>
      )}

      {activeBroadcasts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Active Broadcasts
            </h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Claim window: {claimWindowMinutes} min
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeBroadcasts.map((broadcast) => (
              <BroadcastCard
                key={broadcast.id}
                broadcast={broadcast}
                timezone={timezone}
                onViewDetails={() => setSelectedBroadcastId(broadcast.id)}
              />
            ))}
          </div>
        </section>
      )}

      {completedBroadcasts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Past Broadcasts
            </h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {showAllCompleted 
                ? `${completedBroadcasts.length} total`
                : `Showing ${Math.min(4, completedBroadcasts.length)} of ${completedBroadcasts.length}`
              }
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {displayedCompletedBroadcasts.map((broadcast) => (
              <BroadcastCard
                key={broadcast.id}
                broadcast={broadcast}
                timezone={timezone}
                onViewDetails={() => setSelectedBroadcastId(broadcast.id)}
              />
            ))}
          </div>
          {completedBroadcasts.length > 4 && !showAllCompleted && (
            <button
              onClick={() => setShowAllCompleted(true)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
            >
              Show All Past Broadcasts ({completedBroadcasts.length - 4} more)
            </button>
          )}
        </section>
      )}

      {broadcasts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
          No broadcasts yet. Create your first draft broadcast above.
        </div>
      )}

      {selectedBroadcastId && (
        <BroadcastDetailModal
          broadcastId={selectedBroadcastId}
          timezone={timezone}
          onClose={() => setSelectedBroadcastId(null)}
        />
      )}
    </>
  );
}
