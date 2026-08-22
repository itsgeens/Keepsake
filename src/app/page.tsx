"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function openCamera() {
    const t = token.trim();
    if (!t) return;
    router.push(`/camera/${t}`);
  }

  return (
    <main className="paper-texture flex min-h-full flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="date-stamp text-sm">10.01.26</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-wide text-charcoal">
          GINO + GABBY
        </h1>
        <p className="mt-1 font-sans text-xs uppercase tracking-[0.35em] text-charcoal-muted">
          The Wedding Camera
        </p>
      </div>

      <div className="paper-card w-full max-w-sm rounded-2xl border border-paper-border bg-paper-card p-6 text-center shadow-sm">
        <p className="font-serif text-lg text-charcoal">
          Enter your event link to test the camera.
        </p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openCamera()}
          placeholder="paste the event access token"
          className="mt-4 w-full rounded-xl border border-paper-border bg-paper px-4 py-3 font-mono text-xs text-charcoal outline-none focus:border-wine focus:ring-1 focus:ring-wine"
        />
      </div>

      <button
        type="button"
        onClick={openCamera}
        disabled={!token.trim()}
        className="w-full max-w-sm rounded-full bg-wine px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-widest text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Open Camera
      </button>

      <p className="max-w-sm text-center font-sans text-[11px] leading-relaxed text-charcoal-muted">
        Find the token in Supabase → Table Editor → <code>events</code> → copy
        the <code>access_token</code> value (or use the event <code>slug</code>
        path once admin routes exist).
      </p>
    </main>
  );
}
