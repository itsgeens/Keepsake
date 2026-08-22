"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchEventByToken } from "@/lib/supabase/events";
import { useGuestSession } from "@/hooks/useGuestSession";
import { createClient } from "@/lib/supabase/client";
import type { EventRow } from "@/types/database";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { saveSession } = useGuestSession(token);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventByToken(token).then(setEvent);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const first = firstName.trim();
    if (!first) {
      setError("Please enter your first name.");
      return;
    }
    if (!event) {
      setError("This event could not be found.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const sessionId = crypto.randomUUID();
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("guests")
      .insert({
        event_id: event.id,
        first_name: first,
        last_name: lastName.trim() || null,
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError("Something went wrong joining the camera. Please try again.");
      setSubmitting(false);
      return;
    }

    saveSession(first, lastName.trim(), data.id, sessionId);
    router.push(`/camera/${token}/shoot`);
  }

  return (
    <main className="paper-texture flex min-h-full flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-charcoal-muted">
          Step 1 of 2
        </p>
        <h1 className="mt-3 font-serif text-3xl text-charcoal">
          What should we call you?
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-charcoal-muted"
          >
            First Name
          </label>
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-paper-border bg-paper-card px-4 py-3 font-sans text-charcoal outline-none focus:border-wine focus:ring-1 focus:ring-wine"
            placeholder="e.g. Gabby"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-charcoal-muted"
          >
            Last Name
          </label>
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl border border-paper-border bg-paper-card px-4 py-3 font-sans text-charcoal outline-none focus:border-wine focus:ring-1 focus:ring-wine"
            placeholder="optional"
          />
        </div>

        {error && (
          <p className="font-sans text-sm text-wine">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-wine px-8 py-3.5 font-sans text-sm font-semibold uppercase tracking-widest text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Joining…" : "Start Shooting"}
        </button>
      </form>
    </main>
  );
}
