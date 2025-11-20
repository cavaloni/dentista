"use client";

import { create } from "zustand";

import type { WaitlistMember } from "@/app/(protected)/waitlist/shared";

type PendingMap = Record<string, boolean>;
type SelectedMap = Record<string, boolean>;

type WaitlistState = {
  members: WaitlistMember[];
  pending: PendingMap;
  selected: SelectedMap;
  initialized: boolean;
  needsSync: boolean;
  currentPage: number;
  itemsPerPage: number;
  setMembers: (members: WaitlistMember[]) => void;
  addMember: (member: WaitlistMember) => void;
  updateMember: (member: WaitlistMember) => void;
  toggleMember: (member: WaitlistMember) => void;
  removeMember: (id: string) => void;
  startPending: (id: string) => void;
  finishPending: (id: string) => void;
  resetPending: () => void;
  markNeedsSync: () => void;
  clearNeedsSync: () => void;
  setSelected: (id: string, selected: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: (selected: boolean) => void;
  clearSelected: () => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
};

const sortMembers = (members: WaitlistMember[]) =>
  members
    .slice()
    .sort((a, b) => {
      if (a.priority === b.priority) {
        return a.full_name.localeCompare(b.full_name);
      }
      return b.priority - a.priority;
    });

export const useWaitlistStore = create<WaitlistState>((set, get) => ({
  members: [],
  pending: {},
  selected: {},
  initialized: false,
  needsSync: false,
  currentPage: 1,
  itemsPerPage: 10,
  setMembers: (members) =>
    set({
      members: sortMembers(members),
      initialized: true,
      pending: {},
      needsSync: false,
    }),
  addMember: (member) =>
    set((state) => ({ members: sortMembers([...state.members, member]) })),
  updateMember: (member) =>
    set((state) => ({
      members: sortMembers(
        state.members.map((existing) =>
          existing.id === member.id ? member : existing
        )
      ),
    })),
  toggleMember: (member) => {
    get().updateMember(member);
  },
  removeMember: (id) =>
    set((state) => ({ members: state.members.filter((member) => member.id !== id) })),
  startPending: (id) =>
    set((state) => ({ pending: { ...state.pending, [id]: true } })),
  finishPending: (id) =>
    set((state) => {
      const next = { ...state.pending };
      delete next[id];
      return { pending: next };
    }),
  resetPending: () => set({ pending: {} }),
  markNeedsSync: () => set({ needsSync: true }),
  clearNeedsSync: () => set({ needsSync: false }),
  setSelected: (id, selected) =>
    set((state) => ({ selected: { ...state.selected, [id]: selected } })),
  toggleSelected: (id) =>
    set((state) => ({
      selected: { ...state.selected, [id]: !state.selected[id] },
    })),
  selectAll: (selected) =>
    set((state) => {
      const newSelected: SelectedMap = {};
      state.members.forEach((member) => {
        newSelected[member.id] = selected;
      });
      return { selected: newSelected };
    }),
  clearSelected: () => set({ selected: {} }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setItemsPerPage: (itemsPerPage) => set({ itemsPerPage }),
}));

export const selectMembers = (state: WaitlistState) => state.members;
export const selectPending = (state: WaitlistState) => state.pending;
export const selectSelected = (state: WaitlistState) => state.selected;
export const selectCurrentPage = (state: WaitlistState) => state.currentPage;
export const selectItemsPerPage = (state: WaitlistState) => state.itemsPerPage;
export const selectMemberById = (id: string) => (state: WaitlistState) =>
  state.members.find((member) => member.id === id);
export const selectIsPending = (id: string) => (state: WaitlistState) =>
  Boolean(state.pending[id]);
export const selectIsSelected = (id: string) => (state: WaitlistState) =>
  Boolean(state.selected[id]);
export const selectInitialized = (state: WaitlistState) => state.initialized;
export const selectNeedsSync = (state: WaitlistState) => state.needsSync;
export const selectSelectedCount = (state: WaitlistState) =>
  Object.values(state.selected).filter(Boolean).length;
export const selectPaginatedMembers = (active: boolean = true) => (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === active);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  return filtered.slice(startIndex, endIndex);
};

export const selectTotalPages = (active: boolean = true) => (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === active);
  return Math.ceil(filtered.length / state.itemsPerPage);
};

// Stable selector instances for common use cases
export const selectPaginatedActiveMembers = (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === true);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  return filtered.slice(startIndex, endIndex);
};

export const selectPaginatedInactiveMembers = (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === false);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  return filtered.slice(startIndex, endIndex);
};

export const selectTotalActivePages = (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === true);
  return Math.ceil(filtered.length / state.itemsPerPage);
};

export const selectTotalInactivePages = (state: WaitlistState) => {
  const filtered = state.members.filter((member) => member.active === false);
  return Math.ceil(filtered.length / state.itemsPerPage);
};
