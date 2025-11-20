"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { assignPatientsToBroadcastAction } from "@/app/(protected)/broadcasts/actions";
import type { WaitlistMember } from "@/app/(protected)/waitlist/shared";

type AddPatientsModalProps = {
  broadcastId: string;
  onClose: () => void;
  onSuccess: () => void;
  getAvailablePatients: () => Promise<WaitlistMember[]>;
};

export function AddPatientsModal({
  broadcastId,
  onClose,
  onSuccess,
  getAvailablePatients,
}: AddPatientsModalProps) {
  const [patients, setPatients] = useState<WaitlistMember[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<WaitlistMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      const data = await getAvailablePatients();
      setPatients(data);
      setFilteredPatients(data);
      setLoading(false);
    }
    loadPatients();
  }, [getAvailablePatients]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.channel.toLowerCase().includes(query)
    );
    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

  const togglePatient = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredPatients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatients.map((p) => p.id)));
    }
  };

  const handleAssign = () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await assignPatientsToBroadcastAction(
        broadcastId,
        Array.from(selectedIds)
      );

      if (result.success) {
        onSuccess();
        onClose();
      }
    });
  };

  const allSelected = filteredPatients.length > 0 && selectedIds.size === filteredPatients.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Add Patients to Broadcast
            </h2>
            <p className="text-sm text-slate-400">
              Select patients to assign to this broadcast
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Select All */}
          {filteredPatients.length > 0 && (
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                />
                <span>
                  {allSelected
                    ? "Deselect All"
                    : someSelected
                    ? `${selectedIds.size} Selected`
                    : "Select All"}
                </span>
              </label>
              <span className="text-xs text-slate-500">
                {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Patient List */}
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {loading && (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading patients...
              </div>
            )}

            {!loading && filteredPatients.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-8 text-center text-sm text-slate-400">
                {searchQuery
                  ? "No patients match your search"
                  : "No available patients to assign"}
              </div>
            )}

            {!loading &&
              filteredPatients.map((patient) => (
                <label
                  key={patient.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition hover:border-slate-700 hover:bg-slate-950/70"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(patient.id)}
                    onChange={() => togglePatient(patient.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-200">
                      {patient.full_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {patient.channel.toUpperCase()} • {patient.address}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Priority: {patient.priority}
                      </span>
                      {patient.last_notified_at && (
                        <span className="text-xs text-slate-600">
                          • Last notified
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={selectedIds.size === 0 || isPending}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {isPending
              ? "Assigning..."
              : `Assign ${selectedIds.size} Patient${selectedIds.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
