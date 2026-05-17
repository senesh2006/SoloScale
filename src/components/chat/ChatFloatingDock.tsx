"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
        dir="ltr"
        onClick={toggleDock}
        className={cn(
          "z-[60] flex h-14 w-14 items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent] bg-violet-600 text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300 motion-reduce:transition-none motion-reduce:hover:scale-100",
          dockOpen && "hidden",
        )}
        style={{
          position: "fixed",
          left: "auto",
          top: "auto",
          right: "max(1rem, env(safe-area-inset-right, 0px))",
          bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        }}
        aria-label="Open assistant chat"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {dockOpen ? (
        <div
          dir="ltr"
          className={cn(
            // Do not use glass-grain here: it sets position:relative and (loaded after Tailwind)
            // overrides `position:fixed`, so the panel sits in document flow (bottom-left).
            "animate-fade-in z-[60] flex w-[calc(100vw-1.5rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-white/34 bg-white/34 shadow-[0_1px_3px_rgba(9,9,11,0.07)] shadow-2xl backdrop-blur-xl backdrop-saturate-150",
          )}
          style={{
            position: "fixed",
            left: "auto",
            top: "auto",
            right: "max(1rem, env(safe-area-inset-right, 0px))",
            bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            maxHeight:
              "min(32rem, calc(100dvh - env(safe-area-inset-bottom, 0px) - 2rem))",
          }}
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
