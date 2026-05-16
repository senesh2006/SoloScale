import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white">
        S
      </div>
      <h1 className="mt-8 text-4xl font-bold tracking-tight">SoloScale</h1>
      <p className="mt-3 max-w-lg text-center text-zinc-600">
        All-in-one AI marketing department — strategy, assets, and event
        registration from one dashboard.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          Open dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-white"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
