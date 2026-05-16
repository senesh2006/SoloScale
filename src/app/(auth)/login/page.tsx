"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock login delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  };

  return (
    <div className="relative isolate min-h-screen flex items-center justify-center px-4 overflow-hidden bg-zinc-50">
       {/* Background Gradients */}
       <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-200 to-indigo-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white font-bold text-xl shadow-lg shadow-violet-600/20 mb-6">
            S
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">Welcome back</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Log in to your AI marketing department
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl shadow-zinc-200/50">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <Mail className="h-3 w-3" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="peter@example.com"
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Lock className="h-3 w-3" />
                  Password
                </label>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-500">Forgot?</a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/5"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white transition-all hover:bg-zinc-800 disabled:opacity-50",
                loading && "animate-pulse"
              )}
            >
              {loading ? "Authenticating..." : (
                <>
                  Log In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
             <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Don't have an account?{" "}
              <Link href="/signup" className="text-violet-600 hover:text-violet-500">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center flex items-center justify-center gap-2 text-zinc-400">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Secured by SoloScale Cloud</span>
        </div>
      </div>
    </div>
  );
}
