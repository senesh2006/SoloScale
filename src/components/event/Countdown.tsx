"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  target: string;
  label?: string;
  className?: string;
  compact?: boolean;
};

function diff(target: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
} {
  const ms = target - Date.now();
  if (ms <= 0)
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds, done: false };
}

export function Countdown({ target, label, className, compact }: Props) {
  const targetMs = new Date(target).getTime();
  const [tick, setTick] = useState(() => diff(targetMs));

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;
    setTick(diff(targetMs));
    const id = setInterval(() => setTick(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (Number.isNaN(targetMs)) return null;

  if (tick.done) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700",
          className,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Happening now
      </div>
    );
  }

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold tabular-nums text-white",
          className,
        )}
      >
        <span>{tick.days}d</span>
        <span className="opacity-50">·</span>
        <span>{String(tick.hours).padStart(2, "0")}h</span>
        <span className="opacity-50">·</span>
        <span>{String(tick.minutes).padStart(2, "0")}m</span>
      </span>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {label}
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Cell value={tick.days} unit="days" />
        <Cell value={tick.hours} unit="hours" />
        <Cell value={tick.minutes} unit="min" />
        <Cell value={tick.seconds} unit="sec" />
      </div>
    </div>
  );
}

function Cell({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center shadow-sm">
      <div className="text-2xl font-black tabular-nums text-zinc-950 sm:text-3xl">
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        {unit}
      </div>
    </div>
  );
}
