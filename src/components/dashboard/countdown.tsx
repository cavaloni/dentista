"use client";

import { useEffect, useState } from "react";

function formatDuration(ms: number) {
  if (ms <= 0) return "expired";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return formatDuration(diff);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setLabel(formatDuration(diff));
    }, 1000);

    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
        label === "expired" ? "bg-rose-500/10 text-rose-200" : "bg-cyan-500/10 text-cyan-200"
      }`}
    >
      {label === "expired" ? "Expired" : `Claim window ${label}`}
    </span>
  );
}
