"use client";

import type { Attendee } from "@/types/campaign";
import { format } from "date-fns";
import { User, Mail, Calendar as CalendarIcon, Hash } from "lucide-react";

export function ParticipantsList({ attendees }: { attendees: Attendee[] }) {
  if (attendees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
        <User className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-4 text-sm font-medium text-zinc-500">No participants registered yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-6 py-4 font-black uppercase tracking-widest text-zinc-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  ID
                </div>
              </th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-zinc-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Name
                </div>
              </th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-zinc-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email
                </div>
              </th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-zinc-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  Registered
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {attendees.map((attendee) => (
              <tr key={attendee.id} className="group hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-[10px] text-zinc-400 uppercase tracking-tighter">
                  {attendee.id}
                </td>
                <td className="px-6 py-4 font-bold text-zinc-900">
                  {attendee.name}
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {attendee.email}
                </td>
                <td className="px-6 py-4 text-zinc-500 font-medium">
                  {format(new Date(attendee.created_at), "MMM dd, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
