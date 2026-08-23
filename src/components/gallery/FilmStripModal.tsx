"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Film, Share2, Download } from "lucide-react";
import type { RollPhoto } from "@/components/gallery/PhotoDetailModal";
import {
  loadImageElement,
  renderFilmStrip,
  renderFilmFrame,
} from "@/lib/photo/filmStrip";
import {
  shareOrDownloadCanvases,
  downloadCanvases,
} from "@/lib/photo/shareImage";

const MAX_FRAMES = 5;

type StripMode = "vertical" | "horizontal" | "frames";

const MODES: { value: StripMode; label: string }[] = [
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
  { value: "frames", label: "Frames" },
];

function slugify(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "").toLowerCase() || "filmstrip";
}

interface FilmStripModalProps {
  open: boolean;
  onClose: () => void;
  photos: RollPhoto[];
  coupleName: string;
  eventDate: string;
  onToast: (message: string) => void;
}

export default function FilmStripModal({
  open,
  onClose,
  photos,
  coupleName,
  eventDate,
  onToast,
}: FilmStripModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<StripMode>("vertical");
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imgCache = useRef<Map<string, HTMLImageElement | HTMLCanvasElement>>(
    new Map(),
  );

  const stampText = useMemo(
    () => `${coupleName} ${eventDate}`,
    [coupleName, eventDate],
  );

  function makePlaceholder(): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = 280;
    c.height = 200;
    const cx = c.getContext("2d");
    if (cx) {
      cx.fillStyle = "#2a2825";
      cx.fillRect(0, 0, 280, 200);
      cx.fillStyle = "#6e6e73";
      cx.font = "16px sans-serif";
      cx.textAlign = "center";
      cx.fillText("Unavailable", 140, 105);
    }
    return c;
  }

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selectedIds.includes(p.id)),
    [photos, selectedIds],
  );

  // Live preview: re-render whenever the selection, mode, or stamp changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const images = await Promise.all(
          selectedPhotos.map(async (p) => {
            const cached = imgCache.current.get(p.url);
            if (cached) return cached;
            try {
              const img = await loadImageElement(p.url);
              imgCache.current.set(p.url, img);
              return img;
            } catch {
              const ph = makePlaceholder();
              imgCache.current.set(p.url, ph);
              return ph;
            }
          }),
        );
        if (cancelled) return;

        if (mode === "frames") {
          selectedPhotos.forEach((_, i) => {
            const c = frameRefs.current[i];
            if (c && images[i]) {
              renderFilmFrame(c, images[i], {
                stampText,
                dateStamp: eventDate,
                index: i,
              });
            }
          });
        } else {
          const c = canvasRef.current;
          if (!c) return;
          try {
            await renderFilmStrip(c, images, {
              orientation: mode,
              stampText,
              dateStamp: eventDate,
            });
          } catch {
            const ctx = c.getContext("2d");
            if (ctx) {
              c.width = 0;
              c.height = 0;
            }
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedPhotos, mode, stampText, eventDate]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (selectedIds.length >= MAX_FRAMES) {
      onToast(`You can pick up to ${MAX_FRAMES} photos`);
      return;
    }
    setSelectedIds((prev) => [...prev, id]);
  }

  function selectFirstFive() {
    setSelectedIds(photos.slice(0, MAX_FRAMES).map((p) => p.id));
  }

  function collectCanvases(): HTMLCanvasElement[] {
    if (mode === "frames") {
      return frameRefs.current
        .filter((c): c is HTMLCanvasElement => Boolean(c))
        .slice(0, selectedPhotos.length);
    }
    const c = canvasRef.current;
    return c ? [c] : [];
  }

  async function handleShare() {
    const canvases = collectCanvases();
    if (!canvases.length) return;
    setBusy(true);
    try {
      const res = await shareOrDownloadCanvases(
        canvases,
        `${slugify(coupleName)}-filmstrip`,
        coupleName,
      );
      if (res === "shared") onToast("Saved to your device");
      else if (res === "downloaded")
        onToast(mode === "frames" ? "Frames downloading" : "Download started");
    } catch {
      onToast("Could not export film strip");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    const canvases = collectCanvases();
    if (!canvases.length) return;
    downloadCanvases(canvases, `${slugify(coupleName)}-filmstrip`);
    onToast(mode === "frames" ? "Frames downloading" : "Download started");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-separator px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-secondary text-text-secondary transition-colors hover:text-text-primary active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Your Film Strip
          </h2>
          <p className="text-[11px] text-text-tertiary">
            {selectedPhotos.length} / {MAX_FRAMES} frames
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-28 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Info banner */}
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent-soft p-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">
              Build your 35mm roll
            </p>
            <p className="text-[11px] text-text-secondary">
              Pick up to {MAX_FRAMES} of your photos to render a film strip.
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-separator bg-surface p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              Film Strip Preview
            </span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {selectedPhotos.length === 0 ? (
              <p className="py-10 text-center text-xs text-zinc-500">
                Tap photos below to build your strip
              </p>
            ) : mode === "frames" ? (
              <div className="flex flex-col gap-3">
                {selectedPhotos.map((photo, i) => (
                  <canvas
                    key={photo.id}
                    ref={(el) => {
                      frameRefs.current[i] = el;
                    }}
                    className="w-full rounded shadow-2xl"
                  />
                ))}
              </div>
            ) : (
              <canvas ref={canvasRef} className="block max-w-none rounded shadow-2xl" />
            )}
          </div>
        </div>

        {/* Layout mode */}
        <div className="mb-4">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            Layout
          </label>
          <div className="flex gap-1 rounded-lg bg-surface-secondary p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                  mode === m.value
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-text-tertiary">
            {mode === "frames"
              ? "Each photo becomes its own frame — download or share them all at once."
              : "Best for posting as a single Story or feed image."}
          </p>
        </div>

        {/* Selection grid */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Tap photos to include
          </span>
          {photos.length > 0 && (
            <button
              type="button"
              onClick={selectFirstFive}
              className="text-xs font-semibold text-accent hover:text-accent/80"
            >
              {selectedIds.length > 0 ? "Reset" : `Select 5`}
            </button>
          )}
        </div>

        {photos.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-tertiary">
            You haven&apos;t added any photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              const atCap = selectedIds.length >= MAX_FRAMES && !isSelected;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => toggle(photo.id)}
                  disabled={atCap}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                    isSelected
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-transparent"
                  } ${atCap ? "opacity-40" : "opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo by ${photo.guestName}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow ${
                      isSelected
                        ? "bg-accent text-white"
                        : "bg-black/40 text-white/90"
                    }`}
                  >
                    {isSelected && <span>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex gap-2 border-t border-separator bg-surface/95 px-4 py-3 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),12px)]">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy || selectedPhotos.length === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-separator bg-surface-secondary py-3 text-xs font-semibold text-text-primary transition active:scale-95 disabled:opacity-30"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={busy || selectedPhotos.length === 0}
          className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-xl bg-accent py-3 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-30"
        >
          <Share2 className="h-4 w-4" />
          {busy ? "Saving…" : "Save to device"}
        </button>
      </div>
    </div>
  );
}
