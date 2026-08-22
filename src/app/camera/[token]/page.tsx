"use client";

import { Camera } from "lucide-react";
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

  useEffect(() => {
    if (getStoredSession(token)) {
      router.replace(`/camera/${token}/shoot`);
      return;
    }
    fetchEventByToken(token).then((data) => {
      if (!data) {
        setNotFound(true);
      } else {
        setEvent(data);
      }
      setLoading(false);
    });
  }, [token, router]);

  if (notFound) {
    return (
      <main className="paper-texture flex min-h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-charcoal">Event not found</h1>
        <p className="font-sans text-sm text-charcoal-muted">
          This camera link is invalid or the event is no longer active.
        </p>
      </main>
    );
  }

  const couple = event?.couple_name ?? "GINO + GABBY";
  const date = event ? formatEventDate(event.event_date) : "10.01.26";

  return (
    <main className="paper-texture flex min-h-full flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="date-stamp text-sm">{date}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-wide text-charcoal">
          {couple}
        </h1>
        <p className="mt-1 font-sans text-xs uppercase tracking-[0.35em] text-charcoal-muted">
          The Wedding Camera
        </p>
      </div>

      <div className="paper-card w-full max-w-sm rounded-2xl border border-paper-border bg-paper-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wine-light">
          <Camera className="h-8 w-8 text-wine" strokeWidth={1.5} />
        </div>
        <p className="mt-5 font-serif text-lg text-charcoal">
          Take a picture.
          <br />
          Keep the memory.
        </p>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => router.push(`/camera/${token}/join`)}
        className="w-full max-w-sm rounded-full bg-wine px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-widest text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Loading…" : "Join the Camera"}
      </button>
    </main>
  );
}
