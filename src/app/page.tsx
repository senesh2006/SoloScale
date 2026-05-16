import Link from "next/link";
import { AuthVideoBackground } from "@/components/layout/AuthVideoBackground";
import { MovingGradientBackground } from "@/components/layout/MovingGradientBackground";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  ImageIcon,
  AudioLines,
  Users,
  Zap,
  Check,
  Star,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Calendar,
    title: "Strategy in seconds",
    body: "Describe your goal — get a 14-day multi-channel content calendar tailored to your audience.",
  },
  {
    icon: ImageIcon,
    title: "Flyers that ship",
    body: "Promo graphics generated on-brand and ready to post or print, no Figma round-trips.",
  },
  {
    icon: AudioLines,
    title: "Voiceovers, instantly",
    body: "Natural-sounding narration for reels, ads, and waiting-room audio in one click.",
  },
  {
    icon: Users,
    title: "Hosted registration",
    body: "Public event pages, custom forms, and a live attendee dashboard out of the box.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-zinc-950">
      <MovingGradientBackground variant="light" />

      {/* Animated aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center"
      >
        <div className="aurora-blob h-[500px] w-[800px] rounded-full" />
      </div>

      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-50"
      />

      {/* Floating sparkles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Sparkles className="absolute left-[15%] top-[20%] h-4 w-4 text-violet-300 animate-float" style={{ animationDelay: "0s" }} />
        <Sparkles className="absolute right-[20%] top-[35%] h-3 w-3 text-fuchsia-300 animate-float" style={{ animationDelay: "1.5s" }} />
        <Sparkles className="absolute left-[60%] top-[15%] h-5 w-5 text-indigo-300 animate-float" style={{ animationDelay: "3s" }} />
        <Sparkles className="absolute right-[10%] top-[60%] h-3 w-3 text-violet-300 animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30">
            <span className="font-semibold">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">SoloScale</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
          <a href="#features" className="hover:text-zinc-950 transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-zinc-950 transition-colors">
            Pricing
          </a>
          <Link href="/e/react-summit-2026" className="hover:text-zinc-950 transition-colors">
            Live demo
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-zinc-700 hover:text-zinc-950 sm:block"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-24 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur transition-colors hover:border-zinc-300 animate-fade-up"
          >
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-violet-600" />
              <span className="absolute inset-0 rounded-full bg-violet-600 animate-ping-soft" />
            </span>
            Now in beta · Gemini-powered strategy
            <ArrowRight className="h-3 w-3 text-zinc-400" />
          </Link>

          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl animate-fade-up stagger-1">
            Your marketing team,{" "}
            <span className="whitespace-nowrap gradient-text">automated.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-zinc-600 animate-fade-up stagger-2">
            Strategy, graphics, voiceovers, and event registration — one tool
            for solo founders who'd rather ship than fiddle with Canva.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 animate-fade-up stagger-3">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition-all hover:bg-zinc-800 shine"
            >
              <Sparkles className="h-4 w-4" />
              Try the demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/e/react-summit-2026"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              See a live event page
            </Link>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 animate-fade-up stagger-4">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            No credit card · Mock-mode demo runs locally
          </p>
        </div>

        {/* Product mock */}
        <div className="relative mx-auto mt-20 max-w-5xl animate-fade-up stagger-5">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-violet-200/40 via-fuchsia-100/30 to-indigo-200/40 blur-2xl animate-aurora" />
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/5 transition-transform hover:-translate-y-1">
            {/* fake browser chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <div className="mx-auto rounded-md bg-white px-3 py-1 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200">
                app.soloscale.io/dashboard
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-[200px_1fr]">
              {/* mini sidebar */}
              <div className="hidden border-r border-zinc-100 bg-zinc-50/40 p-4 md:block">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600" />
                  <span className="text-xs font-semibold">SoloScale</span>
                </div>
                <div className="mt-6 space-y-1">
                  {["Overview", "Campaigns", "Calendar"].map((l, i) => (
                    <div
                      key={l}
                      className={
                        i === 1
                          ? "rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700"
                          : "px-2.5 py-1.5 text-xs text-zinc-500"
                      }
                    >
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* content */}
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Campaign
                    </p>
                    <p className="text-base font-semibold">Global React Summit 2026</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Attendees", value: "1,284", trend: "+12%" },
                    { label: "Posts queued", value: "14", trend: "On track" },
                    { label: "Assets", value: "8", trend: "Ready" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-zinc-100 bg-white p-3"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {s.label}
                      </p>
                      <p className="mt-1 text-lg font-semibold tracking-tight">
                        {s.value}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-emerald-600">
                        {s.trend}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-100 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold">Timeline · next 7 days</p>
                    <p className="text-[10px] font-medium text-zinc-400">May 17 – 23</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { type: "Tweet", color: "bg-sky-100 text-sky-700", text: "Hot take on RSC patterns" },
                      { type: "LinkedIn", color: "bg-indigo-100 text-indigo-700", text: "Why solo devs win in 2026" },
                      { type: "Email", color: "bg-amber-100 text-amber-700", text: "Reminder: 3 days to event" },
                    ].map((p) => (
                      <div key={p.type} className="flex items-center gap-3">
                        <span
                          className={
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium " +
                            p.color
                          }
                        >
                          {p.type}
                        </span>
                        <p className="truncate text-xs text-zinc-700">{p.text}</p>
                        <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full w-2/3 rounded-full bg-violet-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / social proof — animated marquee */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-zinc-400">
          Built for indie hackers, agencies, and DevRel teams
        </p>
        <div className="mt-6 marquee">
          <div className="marquee-track">
            {["Indie", "Hackathon", "DevRel", "Founder.cafe", "MakerHQ", "ShipFast", "Buildspace", "OSS Weekly"]
              .concat(["Indie", "Hackathon", "DevRel", "Founder.cafe", "MakerHQ", "ShipFast", "Buildspace", "OSS Weekly"])
              .map((b, i) => (
                <span
                  key={`${b}-${i}`}
                  className="text-base font-semibold tracking-tight text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {b}
                </span>
              ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-violet-600">Everything you need</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            One workflow, four AI agents
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            From the first prompt to the last RSVP, SoloScale handles the busywork
            so you can focus on the work that compounds.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "group relative rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl animate-fade-up",
                `stagger-${i}`,
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 transition-all duration-300 group-hover:rotate-6 group-hover:bg-violet-100">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 px-8 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 opacity-60"
          >
            <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-violet-600/40 blur-3xl animate-float-slow" />
            <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-indigo-500/40 blur-3xl animate-float-slow" style={{ animationDelay: "4s" }} />
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse-soft" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80">
              <Star className="h-3 w-3 text-amber-300" />
              Built in a weekend with a tiny team
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Ready to ship your next launch?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-300">
              Spin up a campaign in mock mode — no API keys needed. Connect
              Firebase and Gemini when you're ready to go live.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                <Rocket className="h-4 w-4" />
                Open dashboard
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-zinc-500 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-950 text-[10px] font-semibold text-white">
              S
            </div>
            <span>© 2026 SoloScale. Crafted for solo founders.</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Zap className="h-3 w-3" />
            <span>Powered by Gemini · Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
