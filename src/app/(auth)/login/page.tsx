import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Log in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Wire Firebase Auth here (Dev 2). Mock mode skips auth for local demos.
        </p>
        <form className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white"
          >
            Continue
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link href="/signup" className="text-violet-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
