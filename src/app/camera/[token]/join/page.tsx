"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchEventByToken } from "@/lib/supabase/events";
import { useGuestSession, getStoredSession } from "@/hooks/useGuestSession";
import { createClient } from "@/lib/supabase/client";
import type { EventRow } from "@/types/database";
import type { FilmStyle } from "@/lib/photo/filmProcessor";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const { saveSession } = useGuestSession(token, event?.guest_photo_limit ?? 25);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [filmStyle, setFilmStyle] = useState<FilmStyle>("mono");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredSession(token)) {
      router.replace(`/camera/${token}/shoot`);
      return;
    }
    fetchEventByToken(token).then(setEvent);
  }, [token, router]);

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
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    saveSession(first, lastName.trim(), data.id, sessionId, filmStyle);
    router.push(`/camera/${token}/shoot`);
  }

  const filmOptions: { value: FilmStyle; label: string; desc: string }[] = [
    { value: "mono", label: "B&W Film", desc: "Classic monochrome" },
    { value: "fuji", label: "Retro Color", desc: "Warm analog tones" },
  ];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="animate-fade-in w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-medium text-text-tertiary tracking-wide uppercase">
            Step 1 of 2
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            What's your name?
          </h1>
          <p className="text-sm text-text-secondary">
            So everyone knows who captured each moment
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide"
              >
                First Name
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="e.g. Gabby"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-1.5 block text-xs font-medium text-text-secondary uppercase tracking-wide"
              >
                Last Name
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="optional"
              />
            </div>
          </div>

          {/* Film style picker */}
          <div>
            <span className="mb-2 block text-xs font-medium text-text-secondary uppercase tracking-wide">
              Choose your film
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filmOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilmStyle(opt.value)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    filmStyle === opt.value
                      ? "border-accent bg-accent-soft ring-2 ring-accent/20"
                      : "border-separator bg-surface-secondary hover:bg-surface-tertiary"
                  }`}
                >
                  <span className="block text-sm font-semibold text-text-primary">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-text-tertiary mt-0.5">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-text-primary px-6 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-30"
          >
            {submitting ? "Joining…" : "Start Shooting"}
          </button>
        </form>
      </div>
    </main>
  );
}
