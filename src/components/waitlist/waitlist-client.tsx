"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";

import type { WaitlistMember } from "@/app/(protected)/waitlist/shared";
import { 
  bulkImportMembersAction, 
  bulkDeleteMembersAction, 
  bulkToggleMembersAction 
} from "@/app/(protected)/waitlist/actions";
import { 
  useWaitlistStore,
  selectSelected,
  selectSelectedCount,
  selectCurrentPage,
  selectItemsPerPage,
  selectPaginatedActiveMembers,
  selectPaginatedInactiveMembers,
  selectTotalActivePages,
  selectTotalInactivePages
} from "@/stores/waitlist";
import { useShallow } from "zustand/react/shallow";

import { MemberRow } from "./member-row";
import { PatientSearch } from "./patient-search";
import { CSVUploadModal, type ImportData } from "./csv-upload-modal";
import { Pagination } from "./pagination";
import { BulkActions } from "./bulk-actions";

type WaitlistClientProps = {
  members: WaitlistMember[];
};

// Stable selector functions defined outside component to prevent re-creation
const selectStoreMembers = (state: ReturnType<typeof useWaitlistStore.getState>) => state.members;
const selectNeedsSync = (state: ReturnType<typeof useWaitlistStore.getState>) => state.needsSync;
const selectSetMembers = (state: ReturnType<typeof useWaitlistStore.getState>) => state.setMembers;
const selectClearNeedsSync = (state: ReturnType<typeof useWaitlistStore.getState>) => state.clearNeedsSync;
const selectSelectAll = (state: ReturnType<typeof useWaitlistStore.getState>) => state.selectAll;
const selectClearSelected = (state: ReturnType<typeof useWaitlistStore.getState>) => state.clearSelected;
const selectSetCurrentPage = (state: ReturnType<typeof useWaitlistStore.getState>) => state.setCurrentPage;
const selectSetItemsPerPage = (state: ReturnType<typeof useWaitlistStore.getState>) => state.setItemsPerPage;

export function WaitlistClient({ members }: WaitlistClientProps) {
  const router = useRouter();
  const memberRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const refreshTimeoutRef = useRef<number | undefined>(undefined);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Use stable selector functions to prevent infinite loops
  const storeMembers = useWaitlistStore(selectStoreMembers);
  const needsSync = useWaitlistStore(selectNeedsSync);
  const setMembers = useWaitlistStore(selectSetMembers);
  const clearNeedsSync = useWaitlistStore(selectClearNeedsSync);
  
  // New selectors for pagination and bulk actions
  const selected = useWaitlistStore(selectSelected);
  const selectedCount = useWaitlistStore(selectSelectedCount);
  const currentPage = useWaitlistStore(selectCurrentPage);
  const itemsPerPage = useWaitlistStore(selectItemsPerPage);
  const paginatedActive = useWaitlistStore(useShallow(selectPaginatedActiveMembers));
  const paginatedInactive = useWaitlistStore(useShallow(selectPaginatedInactiveMembers));
  const totalActivePages = useWaitlistStore(selectTotalActivePages);
  const totalInactivePages = useWaitlistStore(selectTotalInactivePages);
  const selectAllFn = useWaitlistStore(selectSelectAll);
  const clearSelectedFn = useWaitlistStore(selectClearSelected);
  const setCurrentPageFn = useWaitlistStore(selectSetCurrentPage);
  const setItemsPerPageFn = useWaitlistStore(selectSetItemsPerPage);

  useEffect(() => {
    setMembers(members);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  useEffect(() => {
    if (!needsSync) {
      return;
    }

    window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => {
      router.refresh();
      clearNeedsSync();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSync]);

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

  const handleImport = async (data: ImportData[]) => {
    const result = await bulkImportMembersAction(data);
    if (result.success) {
      router.refresh();
    }
    return;
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    if (selectedIds.length === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} member(s)? This action cannot be undone.`);
    if (!confirmed) return;
    
    const result = await bulkDeleteMembersAction(selectedIds);
    if (result.success) {
      clearSelectedFn();
      router.refresh();
    }
  };

  const handleBulkActivate = async () => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    if (selectedIds.length === 0) return;
    
    const result = await bulkToggleMembersAction(selectedIds, true);
    if (result.success) {
      clearSelectedFn();
      router.refresh();
    }
  };

  const handleBulkDeactivate = async () => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    if (selectedIds.length === 0) return;
    
    const result = await bulkToggleMembersAction(selectedIds, false);
    if (result.success) {
      clearSelectedFn();
      router.refresh();
    }
  };

  const _handleSelectAllActive = () => {
    // Select all active members on current page
    selectAllFn(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <PatientSearch
            members={storeMembers}
            onSelectMember={handleSelectMember}
          />
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
      </div>

      <CSVUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImport={handleImport}
      />

      {/* Active Patients Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Active Patients ({categorizedMembers.active.length})
          </h2>
        </div>

        {/* Bulk Actions */}
        <BulkActions
          selectedCount={selectedCount}
          onBulkDelete={handleBulkDelete}
          onBulkActivate={handleBulkActivate}
          onBulkDeactivate={handleBulkDeactivate}
        />

        <div className="space-y-3">
          {paginatedActive.length > 0 ? (
            paginatedActive.map((member) => (
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

        {/* Pagination for Active Patients */}
        {categorizedMembers.active.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalActivePages}
            onPageChange={setCurrentPageFn}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPageFn}
            totalItems={categorizedMembers.active.length}
          />
        )}
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
            {paginatedInactive.map((member) => (
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

          {/* Pagination for Inactive Patients */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalInactivePages}
            onPageChange={setCurrentPageFn}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPageFn}
            totalItems={categorizedMembers.inactive.length}
          />
        </section>
      )}
    </div>
  );
}
