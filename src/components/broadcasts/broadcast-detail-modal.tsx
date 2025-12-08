"use client";

import { Copy, Play, StopCircle, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  getBroadcastDetailAction,
  getAvailablePatientsAction,
  startBroadcastAction,
  deleteBroadcastAction,
  cancelBroadcastAction,
  duplicateBroadcastAction,
  removePatientFromBroadcastAction,
} from "@/app/(protected)/broadcasts/actions";
import type { BroadcastDetail } from "@/app/(protected)/waitlist/shared";
import { AddPatientsModal } from "./add-patients-modal";

type BroadcastDetailModalProps = {
  broadcastId: string;
  timezone: string;
  onClose: () => void;
};

export function BroadcastDetailModal({
  broadcastId,
  timezone: _timezone,
  onClose,
}: BroadcastDetailModalProps) {
  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPatients, setShowAddPatients] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadBroadcast = async () => {
    setLoading(true);
    const data = await getBroadcastDetailAction(broadcastId);
    setBroadcast(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBroadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  const handleStart = () => {
    if (!broadcast || broadcast.status !== "draft") return;
    if (!confirm("Start this broadcast and send invites to all assigned patients?")) return;

    startTransition(async () => {
      const result = await startBroadcastAction(broadcastId);
      if (result.status === "success") {
        await loadBroadcast();
      } else if (result.status === "error" || result.status === "warning") {
        alert(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (!broadcast || broadcast.status !== "draft") return;
    if (!confirm("Delete this draft broadcast? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteBroadcastAction(broadcastId);
      if (result.success) {
        onClose();
      } else {
        alert(result.message);
      }
    });
  };

  const handleCancel = () => {
    if (!broadcast || !["open", "claimed"].includes(broadcast.status)) return;
    if (!confirm("Cancel this broadcast? All pending claims will be cancelled.")) return;

    startTransition(async () => {
      const result = await cancelBroadcastAction(broadcastId);
      if (result.success) {
        await loadBroadcast();
      } else {
        alert(result.message);
      }
    });
  };

  const handleDuplicate = () => {
    if (!broadcast) return;
    if (!confirm(`Duplicate this broadcast with ${broadcast.assigned_count} patient(s)?`)) return;

    startTransition(async () => {
      const result = await duplicateBroadcastAction(broadcastId);
      if (result.status === "success") {
        alert(result.message);
        onClose();
      } else if (result.status === "error") {
        alert(result.message);
      }
    });
  };

  const handleRemovePatient = (patientId: string) => {
    if (!confirm("Remove this patient from the broadcast?")) return;

    startTransition(async () => {
      const result = await removePatientFromBroadcastAction(broadcastId, patientId);
      if (result.success) {
        await loadBroadcast();
      } else {
        alert(result.message);
      }
    });
  };

  const getAvailablePatients = async () => {
    return await getAvailablePatientsAction(broadcastId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Broadcast Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[600px] overflow-y-auto p-6">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading...
            </div>
          )}

          {!loading && !broadcast && (
            <div className="py-12 text-center text-sm text-slate-400">
              Broadcast not found
            </div>
          )}

          {!loading && broadcast && (
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-sm font-medium text-slate-200">
                      {broadcast.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned Patients</p>
                    <p className="text-sm font-medium text-slate-200">
                      {broadcast.assigned_count}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-100">
                  Patients ({broadcast.patients.length})
                </h3>
                {broadcast.patients.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
                    No patients assigned yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {broadcast.patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-200">
                              {patient.full_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {patient.channel.toUpperCase()} • {patient.address}
                            </p>
                            {patient.notified_at && (
                              <p className="mt-1 text-xs text-slate-500">
                                Notified: Wave {patient.wave_number} •{" "}
                                {patient.claim_status}
                              </p>
                            )}
                          </div>
                          {broadcast.status === "draft" && (
                            <button
                              onClick={() => handleRemovePatient(patient.id)}
                              disabled={isPending}
                              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400 disabled:opacity-50"
                              title="Remove patient"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <div className="flex gap-2">
            {broadcast?.status === "draft" && (
              <>
                <button
                  onClick={() => setShowAddPatients(true)}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Patients
                </button>
                <button
                  onClick={handleStart}
                  disabled={isPending || !broadcast || broadcast.assigned_count === 0}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {isPending ? "Starting..." : "Start Broadcast"}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDuplicate}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            {broadcast?.status === "draft" && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg border border-rose-500/50 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            {broadcast && ["open", "claimed"].includes(broadcast.status) && (
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg border border-orange-500/50 px-4 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/10 disabled:opacity-50"
              >
                <StopCircle className="h-4 w-4" />
                Cancel Broadcast
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        {showAddPatients && (
          <AddPatientsModal
            broadcastId={broadcastId}
            onClose={() => setShowAddPatients(false)}
            onSuccess={loadBroadcast}
            getAvailablePatients={getAvailablePatients}
          />
        )}
      </div>
    </div>
  );
}
