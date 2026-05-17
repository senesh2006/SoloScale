"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPanelClass } from "@/components/ui/Card";
import { useDashboardChat } from "./dashboard-chat-context";
import { ChatPanel } from "./ChatPanel";

export function ChatFloatingDock() {
  const pathname = usePathname();
  const { dockOpen, setDockOpen, toggleDock } = useDashboardChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/dashboard/chat") {
    return null;
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={toggleDock}
        className={cn(
          "fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300",
          "bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))]",
          dockOpen && "hidden",
        )}
        aria-label="Open assistant chat"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {dockOpen ? (
        <div
          className={cn(
            glassPanelClass,
            "fixed z-[60] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden shadow-2xl animate-in fade-in duration-200",
            "bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))]",
            "max-h-[min(32rem,calc(100dvh-env(safe-area-inset-bottom)-1.5rem))]",
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
    </>,
    document.body,
  );
}
