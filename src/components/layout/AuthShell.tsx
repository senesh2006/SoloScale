import Link from "next/link";
import { Sparkles, Check } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const highlights = [
  "Build a 2-week multi-channel strategy from a single prompt",
  "Generate on-brand flyers and AI voiceovers in seconds",
  "Publish public event pages with custom forms and live RSVPs",
];

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-between bg-white px-6 py-8 sm:px-12">
        <header>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30">
              <span className="font-semibold">S</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">SoloScale</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-sm py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-8 border-t border-zinc-100 pt-6 text-center text-sm text-zinc-500">
              {footer}
            </div>
          ) : null}
        </main>

        <footer className="flex items-center justify-between text-xs text-zinc-400">
          <span>© 2026 SoloScale</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-600">Privacy</a>
            <a href="#" className="hover:text-zinc-600">Terms</a>
          </div>
        </footer>
      </div>

      {/* Marketing side */}
      <div className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
        >
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-violet-600/50 blur-3xl" />
          <div className="absolute -right-10 bottom-20 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="h-3 w-3 text-amber-300" />
            AI-native marketing OS
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            One workspace.{" "}
            <span className="bg-gradient-to-br from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              Every channel.
            </span>
          </h2>
          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-zinc-300">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                  <Check className="h-3 w-3" />
                </div>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <figure className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm leading-relaxed text-zinc-200">
              “We replaced four tools and a freelance contractor with SoloScale.
              First campaign shipped the same afternoon.”
            </p>
            <figcaption className="mt-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400" />
              <div className="text-xs">
                <p className="font-semibold text-white">Maya Chen</p>
                <p className="text-zinc-400">Founder · Founder.cafe</p>
              </div>
            </figcaption>
          </figure>
        </div>

        <div className="relative text-xs text-zinc-500">
          Trusted by indie hackers in 38 countries
        </div>
      </div>
    </div>
  );
}
