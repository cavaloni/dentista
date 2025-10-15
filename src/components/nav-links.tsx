"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-cyan-500/20 text-cyan-100"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-cyan-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
