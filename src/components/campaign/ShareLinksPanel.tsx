"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Link2,
  Mail,
  MessageSquare,
  Globe,
  Plus,
} from "lucide-react";

type BrandIconProps = { className?: string };

function TwitterIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function FacebookIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M13.5 21v-7.5h2.55l.38-2.97H13.5V8.66c0-.86.24-1.45 1.47-1.45h1.57V4.55c-.27-.04-1.21-.12-2.31-.12-2.28 0-3.84 1.39-3.84 3.95v2.2H7.83v2.97h2.56V21h3.11Z" />
    </svg>
  );
}
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Channel = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  source: string;
  medium: string;
  accent: string;
};

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    icon: TwitterIcon,
    source: "twitter",
    medium: "social",
    accent: "text-zinc-900",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: LinkedinIcon,
    source: "linkedin",
    medium: "social",
    accent: "text-blue-700",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: FacebookIcon,
    source: "facebook",
    medium: "social",
    accent: "text-indigo-600",
  },
  {
    id: "email",
    label: "Email blast",
    icon: Mail,
    source: "email",
    medium: "email",
    accent: "text-emerald-600",
  },
  {
    id: "discord",
    label: "Discord / Slack",
    icon: MessageSquare,
    source: "community",
    medium: "chat",
    accent: "text-fuchsia-600",
  },
];

type Props = {
  slug: string;
  campaignTitle: string;
};

export function ShareLinksPanel({ slug, campaignTitle }: Props) {
  const [campaignTag, setCampaignTag] = useState(
    slugify(campaignTitle).slice(0, 32) || "launch",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://soloscale.app";
  const baseUrl = `${origin}/e/${slug}`;

  const links = useMemo(() => {
    return DEFAULT_CHANNELS.map((c) => {
      const params = new URLSearchParams({
        utm_source: c.source,
        utm_medium: c.medium,
        utm_campaign: campaignTag,
        ref: c.id,
      });
      return { ...c, url: `${baseUrl}?${params.toString()}` };
    });
  }, [baseUrl, campaignTag]);

  function copy(id: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1500);
  }

  return (
    <Card>
      <div className="border-b border-zinc-100 p-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-zinc-900">Share links</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Pre-tagged URLs so you can see where signups come from.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Campaign tag
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              utm_campaign=
            </span>
            <input
              value={campaignTag}
              onChange={(e) =>
                setCampaignTag(slugify(e.target.value).slice(0, 40))
              }
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-[88px] pr-3 text-sm tabular-nums text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder="launch"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-3 py-2">
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
            <span className="truncate font-mono text-[11px] text-zinc-600">
              {baseUrl}
            </span>
            <button
              type="button"
              onClick={() => copy("base", baseUrl)}
              className="ml-auto inline-flex h-6 items-center gap-1 rounded-md bg-white px-2 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200 hover:text-violet-600"
            >
              {copiedId === "base" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>

          {links.map((link) => {
            const Icon = link.icon;
            const isCopied = copiedId === link.id;
            return (
              <div
                key={link.id}
                className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
                  <Icon className={cn("h-4 w-4", link.accent)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900">
                    {link.label}
                  </p>
                  <p className="truncate font-mono text-[10.5px] text-zinc-500">
                    ?utm_source={link.source}&ref={link.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(link.id, link.url)}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold ring-1 transition-all",
                    isCopied
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-white text-zinc-600 ring-zinc-200 hover:text-violet-600",
                  )}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            const u = `${baseUrl}?utm_campaign=${campaignTag}`;
            copy("plain", u);
          }}
        >
          Copy plain tagged link
        </Button>
      </div>
    </Card>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
