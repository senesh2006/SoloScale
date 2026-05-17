"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardChat } from "./dashboard-chat-context";
import { ChatPanel } from "./ChatPanel";

export function ChatFloatingDock() {
  const pathname = usePathname();
  const { dockOpen, setDockOpen, toggleDock } = useDashboardChat();

  if (pathname === "/dashboard/chat") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleDock}
        className={cn(
          "fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300",
          dockOpen && "hidden",
        )}
        aria-label="Open assistant chat"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {dockOpen ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[60] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            "max-h-[min(32rem,calc(100vh-5rem))]",
          )}
          role="dialog"
          aria-label="Assistant chat"
        >
          <button
            type="button"
            onClick={() => setDockOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close chat window"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex min-h-0 flex-1 flex-col pt-1">
            <ChatPanel variant="floating" />
          </div>
        </div>
      ) : null}
    </>
  );
}
