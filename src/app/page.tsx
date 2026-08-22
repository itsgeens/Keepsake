"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function openCamera() {
    const t = token.trim();
    if (!t) return;
    router.push(`/camera/${t}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="animate-fade-in w-full max-w-sm space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-secondary">
          <Camera className="h-9 w-9 text-text-secondary" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            The Wedding Camera
          </h1>
          <p className="text-sm text-text-secondary">
            Enter your event code to get started
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openCamera()}
            placeholder="Event access token"
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
          <button
            type="button"
            onClick={openCamera}
            disabled={!token.trim()}
            className="w-full rounded-xl bg-text-primary px-6 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-30"
          >
            Open Camera
          </button>
        </div>

        {/* Helper */}
        <p className="text-xs leading-relaxed text-text-tertiary">
          Find the token in Supabase → events table →{" "}
          <code className="rounded bg-surface-secondary px-1 py-0.5 text-text-secondary">
            access_token
          </code>
        </p>
      </div>
    </main>
  );
}
