"use client";

import type { ContentType } from "@/types/campaign";
import { MessageSquare, Share2, MoreHorizontal, MessageCircle, Repeat2, Heart, Share, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SocialPreviewProps = {
  type: ContentType;
  copy: string;
  authorName: string;
  authorHandle: string;
  date: string;
  image?: string;
};

export function SocialPreview({ type, copy, authorName, authorHandle, date, image }: SocialPreviewProps) {
  if (type === "tweet") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm font-sans max-w-[500px]">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 truncate">
                <span className="font-bold text-zinc-950 text-[15px]">{authorName}</span>
                <span className="text-zinc-500 text-[15px]">@{authorHandle} · {date}</span>
              </div>
              <MoreHorizontal className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-1 text-[15px] text-zinc-900 leading-normal whitespace-pre-wrap">
              {copy}
            </p>
            {image && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
                <img src={image} alt="Tweet content" className="w-full object-cover" />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-zinc-500 max-w-[350px]">
              <div className="flex items-center gap-1.5 hover:text-sky-500 transition-colors cursor-pointer">
                <MessageCircle className="h-[18px] w-[18px]" />
                <span className="text-xs font-medium">12</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer">
                <Repeat2 className="h-[18px] w-[18px]" />
                <span className="text-xs font-medium">4</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-pink-500 transition-colors cursor-pointer">
                <Heart className="h-[18px] w-[18px]" />
                <span className="text-xs font-medium">48</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-sky-500 transition-colors cursor-pointer">
                <Share className="h-[18px] w-[18px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "linkedin") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm font-sans max-w-[550px]">
        <div className="p-4 flex gap-2">
          <div className="h-12 w-12 shrink-0 rounded-sm bg-zinc-200" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-zinc-950 text-sm">{authorName}</p>
                <p className="text-[10px] text-zinc-500">Founder & CEO at SoloScale</p>
                <div className="flex items-center gap-1 mt-0.5">
                   <p className="text-[10px] text-zinc-500">{date} ·</p>
                   <Globe2 className="h-3 w-3 text-zinc-500" />
                </div>
              </div>
              <button className="text-violet-600 text-sm font-bold hover:bg-violet-50 px-2 py-1 rounded transition-colors">+ Follow</button>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm text-zinc-900 leading-relaxed whitespace-pre-wrap">
            {copy}
          </p>
        </div>
        {image && (
          <div className="border-y border-zinc-100 bg-zinc-50">
            <img src={image} alt="LinkedIn content" className="w-full object-cover max-h-[300px]" />
          </div>
        )}
        <div className="px-4 py-2 border-t border-zinc-100 flex items-center justify-between">
           <div className="flex -space-x-1">
              <div className="h-4 w-4 rounded-full bg-sky-500 border border-white flex items-center justify-center">
                 <Heart className="h-2 w-2 text-white fill-white" />
              </div>
              <div className="h-4 w-4 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                 <Share2 className="h-2 w-2 text-white fill-white" />
              </div>
              <span className="ml-6 text-[10px] text-zinc-500 font-medium">82</span>
           </div>
           <p className="text-[10px] text-zinc-500 font-medium">12 comments · 4 shares</p>
        </div>
      </div>
    );
  }

  // Fallback for reel or email
  return (
    <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
        Preview for {type} coming soon
      </p>
    </div>
  );
}
