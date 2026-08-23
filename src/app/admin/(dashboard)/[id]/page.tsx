"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Copy, Check, RefreshCw, Download } from "lucide-react";
import { exportPlainQr, exportFilmQr } from "@/lib/qr/exportQr";

interface AdminEvent {
  id: string;
  name: string;
  couple_name: string;
  event_date: string;
  slug: string;
  access_token: string;
  status: string;
  guest_photo_limit: number;
  photo_count: number;
}

export default function ManageEventPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [status, setStatus] = useState("active");
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const qrHolderRef = useRef<HTMLDivElement>(null);

  function getQrSvg(): SVGSVGElement | null {
    return qrHolderRef.current?.querySelector("svg") ?? null;
  }

  async function handleExportPlain() {
    const svg = getQrSvg();
    if (!svg || !event) return;
    await exportPlainQr(svg, `qr-${event.slug}.png`);
  }

  async function handleExportFilm() {
    const svg = getQrSvg();
    if (!svg || !event) return;
    await exportFilmQr(
      svg,
      `qr-${event.slug}-film.png`,
      event.couple_name,
      event.event_date,
    );
  }

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d || d.error) {
          throw new Error(d?.error ?? `Request failed (${r.status})`);
        }
        setOrigin(window.location.origin);
        setEvent(d.event);
        setStatus(d.event.status);
        setLimit(d.event.guest_photo_limit);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load event."))
      .finally(() => setLoading(false));
  }, [id]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, guest_photo_limit: limit }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
    } else {
      setEvent(data.event);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function regenerateToken() {
    const res = await fetch(`/api/admin/events/${id}/token`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to regenerate token.");
      return;
    }
    setEvent((prev) => (prev ? { ...prev, access_token: data.access_token } : prev));
  }

  const joinUrl = event ? `${origin}/camera/${event.access_token}/join` : "";

  if (loading) {
    return <p className="text-sm text-text-tertiary">Loading…</p>;
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="flex items-center gap-1.5 text-sm font-medium text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-sm text-danger">{error ?? "Event not found."}</p>
      </div>
    );
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
          {event.couple_name}
        </h1>
        <p className="text-sm text-text-secondary">
          {event.event_date} · {event.photo_count} photos uploaded
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && (
        <p className="text-sm text-success">Saved.</p>
      )}

      {/* Access link + QR */}
      <section className="rounded-2xl border border-separator bg-surface-secondary p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Guest access
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-3">
              {joinUrl && (
                <QRCodeSVG value={joinUrl} size={168} level="M" />
              )}
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleExportPlain}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-separator bg-surface px-3 py-2 text-xs font-semibold text-text-primary transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Plain
              </button>
              <button
                type="button"
                onClick={handleExportFilm}
                className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Film card
              </button>
            </div>
          </div>

          {/* Hidden high-res QR used only for export */}
          <div
            ref={qrHolderRef}
            className="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0"
            aria-hidden
          >
            {joinUrl && (
              <QRCodeSVG value={joinUrl} size={600} level="M" marginSize={2} />
            )}
          </div>
          <div className="w-full flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Join link
              </span>
              <button
                type="button"
                onClick={() => copy(joinUrl, "link")}
                className="flex items-center gap-1 text-xs font-medium text-accent"
              >
                {copied === "link" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="break-all rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
              {joinUrl}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Access token
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={regenerateToken}
                  className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => copy(event.access_token, "token")}
                  className="flex items-center gap-1 text-xs font-medium text-accent"
                >
                  {copied === "token" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === "token" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="break-all rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
              {event.access_token}
            </p>
            <p className="pt-1 text-[11px] text-text-tertiary">
              Photos upload to{" "}
              <code className="text-text-secondary">
                wedding-photos/{event.id}/…
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-4 rounded-2xl border border-separator bg-surface-secondary p-5">
        <h2 className="text-sm font-semibold text-text-primary">Settings</h2>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Status
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["active", "draft", "closed", "archived"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-all ${
                  status === s
                    ? "border-accent bg-accent-soft text-text-primary ring-2 ring-accent/20"
                    : "border-separator bg-surface text-text-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
            Max photos per guest
          </label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-xl border border-separator bg-surface px-4 py-3 text-[15px] text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-text-primary px-6 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </section>
    </div>
  );
}
