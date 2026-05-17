"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useDashboardChat, type ChatTurn } from "./dashboard-chat-context";

type Props = {
  variant?: "page" | "floating";
};

export function ChatPanel({ variant = "page" }: Props) {
  const { messages, setMessages } = useDashboardChat();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const compact = variant === "floating";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<{ role: "assistant"; content: string }>(
        "/api/chat",
        {
          method: "POST",
          body: JSON.stringify({ messages: next }),
        },
      );
      setMessages([
        ...next,
        { role: "assistant", content: res.content },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages(next.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, setMessages]);

  return (
    <div
      className={cn(
        "flex flex-col",
        compact ? "h-full min-h-0" : "h-[calc(100vh-8rem)] max-w-3xl mx-auto gap-4 pb-8",
      )}
    >
      {!compact && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">
            Assistant
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">Chat</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Uses your campaigns for context (not attendees). Ask to create a
            campaign when you&apos;re ready.
          </p>
        </div>
      )}

      {compact && (
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 pr-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                SoloScale AI
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                Campaign-aware · no attendee data
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm",
          compact && "rounded-none border-0 shadow-none",
        )}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 && !loading && (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 text-center text-zinc-600",
                compact ? "py-8" : "py-16",
              )}
            >
              <Sparkles className="h-8 w-8 text-violet-500" />
              <p className="max-w-sm text-sm">
                Ask about your campaigns, draft copy, or say you want a new
                campaign created.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-violet-600 text-white"
                    : "border border-zinc-100 bg-zinc-50 text-zinc-900",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <form
          className="flex gap-2 border-t border-zinc-100 p-3 md:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            disabled={loading}
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="dark"
            disabled={loading || !input.trim()}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
