"use client";

import { format } from "date-fns";
import type { ContentItem, ContentType } from "@/types/campaign";
import {
  MessageSquare,
  Mail,
  Send,
  Share2,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SocialPreview } from "./SocialPreview";

const typeIcons: Record<string, React.ElementType> = {
  tweet: MessageSquare,
  linkedin: Share2,
  reel: Send,
  email: Mail,
};

const typeStyles: Record<string, string> = {
  tweet: "bg-sky-50 text-sky-600 ring-sky-100",
  linkedin: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  reel: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100",
  email: "bg-amber-50 text-amber-600 ring-amber-100",
};

const typeLabels: Record<ContentType, string> = {
  tweet: "Tweet",
  linkedin: "LinkedIn",
  reel: "Reel",
  email: "Email",
};

export function StrategyTimeline({
  items,
  authorName,
  authorHandle,
}: {
  items: ContentItem[];
  authorName?: string;
  authorHandle?: string;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const previewAuthorName = authorName?.trim() || "Your name";
  const previewAuthorHandle = authorHandle?.trim() || "your_handle";

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
        <p className="mt-3 text-sm text-zinc-500">Orchestrating strategy…</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-6">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-zinc-200 via-zinc-200 to-transparent" />

      {items.map((item) => {
        const Icon = typeIcons[item.type] ?? Send;
        const styles = typeStyles[item.type] ?? typeStyles.tweet;
        const isPreviewing = previewId === item.id;
        const isCopied = copiedId === item.id;
        const supportsPreview = item.type === "tweet" || item.type === "linkedin";

        return (
          <li key={item.id} className="relative flex gap-5">
            <div
              className={cn(
                "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset shadow-[0_1px_2px_rgba(9,9,11,0.04)]",
                styles,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>

            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-zinc-500">
                    {format(new Date(item.scheduled_at), "MMM d · h:mm a")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                      styles,
                    )}
                  >
                    {typeLabels[item.type] ?? item.type}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copy(item.id, item.copy)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                  {supportsPreview && (
                    <button
                      onClick={() =>
                        setPreviewId(isPreviewing ? null : item.id)
                      }
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                    >
                      {isPreviewing ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Preview
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "mt-2 rounded-xl border transition-all",
                  isPreviewing
                    ? "border-violet-200 bg-violet-50/30 p-4"
                    : "border-zinc-100 bg-zinc-50/50 p-4 hover:bg-white hover:shadow-sm",
                )}
              >
                {isPreviewing ? (
                  <SocialPreview
                    type={item.type}
                    copy={item.copy}
                    authorName={previewAuthorName}
                    authorHandle={previewAuthorHandle}
                    date={format(new Date(item.scheduled_at), "MMM d")}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {item.copy}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
