"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import type { WaitlistMember } from "@/app/(protected)/waitlist/actions";
import { useWaitlistStore } from "@/stores/waitlist";

import { MemberRow } from "./member-row";
import { PatientSearch } from "./patient-search";

type WaitlistClientProps = {
  members: WaitlistMember[];
};

// Stable selector functions defined outside component to prevent re-creation
const selectStoreMembers = (state: ReturnType<typeof useWaitlistStore.getState>) => state.members;
const selectNeedsSync = (state: ReturnType<typeof useWaitlistStore.getState>) => state.needsSync;
const selectSetMembers = (state: ReturnType<typeof useWaitlistStore.getState>) => state.setMembers;
const selectClearNeedsSync = (state: ReturnType<typeof useWaitlistStore.getState>) => state.clearNeedsSync;

export function WaitlistClient({ members }: WaitlistClientProps) {
  const router = useRouter();
  const memberRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const refreshTimeoutRef = useRef<number | undefined>(undefined);

  // Use stable selector functions to prevent infinite loops
  const storeMembers = useWaitlistStore(selectStoreMembers);
  const needsSync = useWaitlistStore(selectNeedsSync);
  const setMembers = useWaitlistStore(selectSetMembers);
  const clearNeedsSync = useWaitlistStore(selectClearNeedsSync);

  useEffect(() => {
    setMembers(members);
  }, [members, setMembers]);

  useEffect(() => {
    if (!needsSync) {
      return;
    }

    window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => {
      router.refresh();
      clearNeedsSync();
    }, 250);
  }, [needsSync, router, clearNeedsSync]);

  useEffect(() => {
    return () => {
      window.clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const categorizedMembers = useMemo(() => {
    const active = storeMembers.filter((member) => member.active);
    const inactive = storeMembers.filter((member) => !member.active);
    return { active, inactive };
  }, [storeMembers]);

  const handleSelectMember = (memberId: string) => {
    // Scroll to the selected member
    const element = memberRefs.current[memberId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a highlight effect
      element.classList.add("ring-2", "ring-cyan-400");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-cyan-400");
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      <PatientSearch
        members={storeMembers}
        onSelectMember={handleSelectMember}
      />

      {/* Active Patients Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Active Patients ({categorizedMembers.active.length})
          </h2>
        </div>
        <div className="space-y-3">
          {categorizedMembers.active.length > 0 ? (
            categorizedMembers.active.map((member) => (
              <div
                key={member.id}
                ref={(el) => {
                  memberRefs.current[member.id] = el;
                }}
                className="transition-all duration-300"
              >
                <MemberRow member={member} />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/50 p-8 text-center text-sm text-slate-400">
              No active patients.
            </div>
          )}
        </div>
      </section>

      {/* Deactivated Patients Section */}
      {categorizedMembers.inactive.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              Deactivated Patients ({categorizedMembers.inactive.length})
            </h2>
          </div>
          <div className="space-y-3 opacity-60">
            {categorizedMembers.inactive.map((member) => (
              <div
                key={member.id}
                ref={(el) => {
                  memberRefs.current[member.id] = el;
                }}
                className="transition-all duration-300"
              >
                <MemberRow member={member} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
