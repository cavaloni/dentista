"use client";

import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";

import type { WaitlistMember } from "@/app/(protected)/waitlist/shared";

type PatientSearchProps = {
  members: WaitlistMember[];
  onSelectMember: (memberId: string) => void;
};

export function PatientSearch({ members, onSelectMember }: PatientSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(members, {
      keys: [
        { name: "full_name", weight: 0.7 },
        { name: "address", weight: 0.2 },
        { name: "channel", weight: 0.1 },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [members]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Use fuzzy search if there's a query, otherwise show all
  const filteredMembers = useMemo(() => {
    if (!search.trim()) {
      return members;
    }
    
    const results = fuse.search(search);
    return results.map(result => result.item);
  }, [search, fuse, members]);

  const activeMembers = filteredMembers.filter((m) => m.active);
  const inactiveMembers = filteredMembers.filter((m) => !m.active);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-400 transition cursor-pointer hover:border-slate-700 hover:bg-slate-950/60"
      >
        <Search className="h-4 w-4" />
        <span>Search patients...</span>
        <kbd className="ml-auto rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-xs text-slate-400">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 pt-20 backdrop-blur-sm">
          <Command
            className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
            shouldFilter={false}
          >
            <div className="flex items-center border-b border-slate-800 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search by name, phone, or channel..."
                className="flex h-12 w-full bg-transparent py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                }}
                className="ml-2 rounded-md p-1 cursor-pointer text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              {search && filteredMembers.length === 0 && (
                <Command.Empty className="py-6 text-center text-sm text-slate-400">
                  No patients found.
                </Command.Empty>
              )}

              {activeMembers.length > 0 && (
                <Command.Group
                  heading="Active Patients"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-400"
                >
                  {activeMembers.map((member) => (
                    <Command.Item
                      key={member.id}
                      value={member.id}
                      onSelect={() => {
                        onSelectMember(member.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 text-sm text-slate-200 aria-selected:bg-slate-800 aria-selected:text-slate-100"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.full_name}</span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
                            Active
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {member.channel.toUpperCase()} · {member.address}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Priority {member.priority}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {inactiveMembers.length > 0 && (
                <Command.Group
                  heading="Deactivated Patients"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-400"
                >
                  {inactiveMembers.map((member) => (
                    <Command.Item
                      key={member.id}
                      value={member.id}
                      onSelect={() => {
                        onSelectMember(member.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 text-sm text-slate-200 aria-selected:bg-slate-800 aria-selected:text-slate-100"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.full_name}</span>
                          <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                            Deactivated
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {member.channel.toUpperCase()} · {member.address}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Priority {member.priority}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
