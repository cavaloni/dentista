"use client";

import { create } from "zustand";

import type { WaitlistMember } from "@/app/(protected)/waitlist/actions";

type PendingMap = Record<string, boolean>;

type WaitlistState = {
  members: WaitlistMember[];
  pending: PendingMap;
  initialized: boolean;
  needsSync: boolean;
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
  initialized: false,
  needsSync: false,
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
}));

export const selectMembers = (state: WaitlistState) => state.members;
export const selectPending = (state: WaitlistState) => state.pending;
export const selectMemberById = (id: string) => (state: WaitlistState) =>
  state.members.find((member) => member.id === id);
export const selectIsPending = (id: string) => (state: WaitlistState) =>
  Boolean(state.pending[id]);
export const selectInitialized = (state: WaitlistState) => state.initialized;
export const selectNeedsSync = (state: WaitlistState) => state.needsSync;
