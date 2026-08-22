"use client";

import { Camera, ArrowRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchEventByToken } from "@/lib/supabase/events";
import { formatEventDate } from "@/lib/format";
import { getStoredSession } from "@/hooks/useGuestSession";
import type { EventRow } from "@/types/database";

export default function WelcomePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (getStoredSession(token)) {
      router.replace(`/camera/${token}/shoot`);
      return;
    }
    let active = true;
    setLoading(true);
    fetchEventByToken(token)
      .then((data) => {
        if (!active) return;
        if (!data) setNotFound(true);
        else setEvent(data);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, router]);

  if (!configured) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          Configuration Error
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Supabase environment variables are missing.
        </p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          Event Not Found
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          This camera link is invalid or the event is no longer active.
        </p>
      </main>
    );
  }

  const couple = event?.couple_name ?? "GINO + GABBY";
  const date = event ? formatEventDate(event.event_date) : "10.01.26";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="animate-fade-in w-full max-w-sm space-y-10 text-center">
        {/* Camera icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-secondary">
          <Camera className="h-9 w-9 text-text-secondary" strokeWidth={1.5} />
        </div>

        {/* Event info */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            {couple}
          </h1>
          <p className="text-sm font-medium text-text-tertiary">
            {date} · The Wedding Camera
          </p>
        </div>

        {/* Tagline */}
        <div className="space-y-1">
          <p className="text-lg font-medium text-text-primary">
            Take a picture.
          </p>
          <p className="text-lg text-text-secondary">
            Keep the memory.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.push(`/camera/${token}/join`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-text-primary px-6 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-30"
          >
            <span>Join the Camera</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-text-tertiary">
            No app download. No account needed.
          </p>
        </div>
      </div>
    </main>
  );
}
