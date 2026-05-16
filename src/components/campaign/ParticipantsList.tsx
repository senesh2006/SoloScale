"use client";

import type { Attendee } from "@/types/campaign";
import { format, formatDistanceToNow } from "date-fns";
import { User, Mail, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { initials } from "@/lib/utils";

export function ParticipantsList({ attendees }: { attendees: Attendee[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return attendees;
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.email.toLowerCase().includes(needle),
    );
  }, [attendees, q]);

  function exportCsv() {
    const header = "name,email,registered_at\n";
    const rows = attendees
      .map((a) => `"${a.name}","${a.email}","${a.created_at}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (attendees.length === 0) {
    return (
      <EmptyState
        icon={<User className="h-5 w-5" />}
        title="No participants yet"
        description="When people sign up, they'll appear here in real time."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${attendees.length} attendees...`}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/40">
              <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                Name
              </th>
              <th className="px-5 py-3 text-xs font-medium text-zinc-500">
                Email
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 text-[11px] font-semibold text-violet-700">
                      {initials(a.name)}
                    </div>
                    <span className="font-medium text-zinc-900">{a.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-600">
                  <a
                    href={`mailto:${a.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-violet-600"
                  >
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    {a.email}
                  </a>
                </td>
                <td
                  className="px-5 py-3 text-right text-zinc-500"
                  title={format(new Date(a.created_at), "PPpp")}
                >
                  {formatDistanceToNow(new Date(a.created_at))} ago
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-10 text-center text-sm text-zinc-500"
                >
                  No matches for "{q}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
