"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail, Lock, User } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 600);
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Spin up your AI marketing team in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-violet-600 hover:text-violet-700"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <TextField
          name="name"
          label="Full name"
          placeholder="Peter Senesh"
          leftIcon={<User className="h-4 w-4" />}
          required
          autoComplete="name"
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          required
          autoComplete="email"
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          leftIcon={<Lock className="h-4 w-4" />}
          required
          minLength={8}
          autoComplete="new-password"
          hint="Use a mix of letters, numbers, and symbols."
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={loading}
          rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {loading ? "Creating workspace" : "Create account"}
        </Button>

        <p className="text-center text-xs text-zinc-500">
          By signing up, you agree to our{" "}
          <a href="#" className="font-medium text-zinc-700 hover:text-violet-700">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-zinc-700 hover:text-violet-700">
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </AuthShell>
  );
}
