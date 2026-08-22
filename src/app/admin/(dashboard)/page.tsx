"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, QrCode } from "lucide-react";

interface AdminEvent {
  id: string;
  name: string;
  couple_name: string;
  event_date: string;
  access_token: string;
  status: string;
  guest_photo_limit: number;
  created_at: string;
  photo_count: number;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-surface-tertiary text-text-secondary",
  closed: "bg-danger/10 text-danger",
  archived: "bg-surface-tertiary text-text-tertiary",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEvents(d.events ?? []);
      })
      .catch(() => setError("Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Events
          </h1>
          <p className="text-sm text-text-secondary">
            Manage camera events, access links and photo limits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/new")}
          className="flex items-center gap-1.5 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          New event
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-tertiary">Loading…</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-separator bg-surface-secondary px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">
            No events yet. Create your first camera event.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => router.push(`/admin/${e.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-separator bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-text-primary">
                    {e.couple_name}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {e.event_date} · {e.photo_count} photos · limit {e.guest_photo_limit}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                      statusStyles[e.status] ?? statusStyles.draft
                    }`}
                  >
                    {e.status}
                  </span>
                  <QrCode className="h-4 w-4 text-text-tertiary" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
