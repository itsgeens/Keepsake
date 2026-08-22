"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [coupleName, setCoupleName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestLimit, setGuestLimit] = useState(25);
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        couple_name: coupleName,
        event_date: eventDate,
        guest_photo_limit: guestLimit,
        status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create event.");
      setSubmitting(false);
      return;
    }
    router.push(`/admin/${data.event.id}`);
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin")}
        className="flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          New Event
        </h1>
        <p className="text-sm text-text-secondary">
          Guests joined with the generated link upload to this event&apos;s folder.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Event name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Gino & Gabby Wedding"
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Couple name (shown to guests)
          </label>
          <input
            value={coupleName}
            onChange={(e) => setCoupleName(e.target.value)}
            placeholder="Defaults to event name"
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Event date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Max photos per guest
          </label>
          <input
            type="number"
            min={1}
            value={guestLimit}
            onChange={(e) => setGuestLimit(Number(e.target.value))}
            className="w-full rounded-xl border border-separator bg-surface-secondary px-4 py-3.5 text-[15px] text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["active", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-all ${
                  status === s
                    ? "border-accent bg-accent-soft text-text-primary ring-2 ring-accent/20"
                    : "border-separator bg-surface-secondary text-text-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-text-primary px-6 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
