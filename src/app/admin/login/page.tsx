"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Invalid password.");
      setSubmitting(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Admin Access
          </h1>
          <p className="text-sm text-text-secondary">
            Enter the admin password to manage events.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Password"
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-text-primary px-6 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-30"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
