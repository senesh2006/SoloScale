"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/calendar", label: "Calendar" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 flex w-64 flex-col bg-zinc-950 px-4 py-8 text-white">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">SoloScale</span>
        </div>
        
        <nav className="mt-12 flex flex-col gap-1.5">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-900 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Senesh Fernando</span>
              <span className="text-xs text-zinc-500 text-ellipsis overflow-hidden">senesh@example.com</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-10">{children}</main>
    </div>
  );
}
