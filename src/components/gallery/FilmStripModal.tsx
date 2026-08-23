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
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    photos.slice(0, MAX_FRAMES).map((p) => p.id),
  );
  const [mode, setMode] = useState<StripMode>("horizontal");
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
    c.width = 340;
    c.height = 230;
    const cx = c.getContext("2d");
    if (cx) {
      cx.fillStyle = "#1e1d1b";
      cx.fillRect(0, 0, 340, 230);
      cx.fillStyle = "#8e8e93";
      cx.font = "14px sans-serif";
      cx.textAlign = "center";
      cx.fillText("Unavailable", 170, 115);
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
        if (selectedPhotos.length === 0) return;

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

  function handleResetOrSelectAll() {
    if (selectedIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.slice(0, MAX_FRAMES).map((p) => p.id));
    }
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
            {selectedPhotos.length} / {MAX_FRAMES} frames selected
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-28 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Info banner */}
        <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent-soft p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary">
              Build your 35mm film roll
            </p>
            <p className="text-[11px] text-text-secondary">
              Pick up to {MAX_FRAMES} photos to render your authentic negative strip.
            </p>
          </div>
        </div>

        {/* Lightbox Preview Card */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-separator/80 bg-surface shadow-sm">
          {/* Lightbox header bar */}
          <div className="flex items-center justify-between border-b border-separator/60 px-3.5 py-2 bg-surface-secondary/50">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-primary">
                35mm Lightbox Preview
              </span>
            </div>
            <span className="font-mono text-[10px] font-medium text-text-tertiary">
              {selectedPhotos.length} {selectedPhotos.length === 1 ? "frame" : "frames"} •{" "}
              {mode === "horizontal"
                ? "Horizontal"
                : mode === "vertical"
                  ? "Vertical"
                  : "Individual"}
            </span>
          </div>

          {/* Light table preview canvas area */}
          <div className="relative min-h-[190px] bg-[#ece8df] border-b border-[#ded7ca]/60 flex items-center justify-center">
            {selectedPhotos.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Film className="mx-auto h-7 w-7 text-text-tertiary/40 mb-1.5" />
                <p className="text-xs font-semibold text-text-secondary">
                  No photos selected
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  Tap photos below to build your 35mm film strip
                </p>
              </div>
            ) : mode === "horizontal" ? (
              <div className="w-full overflow-x-auto overflow-y-hidden py-4 px-4 flex items-center justify-start">
                <canvas
                  ref={canvasRef}
                  className="h-44 sm:h-52 w-auto max-w-none block my-auto rounded shadow-2xl transition-all shrink-0"
                />
              </div>
            ) : mode === "vertical" ? (
              <div className="w-full max-h-[360px] sm:max-h-[400px] overflow-y-auto overflow-x-hidden py-4 px-3 flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full max-w-[240px] sm:max-w-[270px] h-auto block my-auto rounded shadow-2xl transition-all"
                />
              </div>
            ) : (
              <div className="w-full overflow-x-auto overflow-y-hidden py-4 px-4 flex gap-3.5 snap-x snap-mandatory justify-start">
                {selectedPhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="relative shrink-0 snap-center flex flex-col items-center"
                  >
                    <canvas
                      ref={(el) => {
                        frameRefs.current[i] = el;
                      }}
                      className="w-[230px] sm:w-[260px] h-auto rounded shadow-2xl block"
                    />
                    <span className="mt-2 inline-block rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-mono font-medium text-white/90">
                      Frame {i + 1} of {selectedPhotos.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scroll hint bar */}
          {selectedPhotos.length > 0 && (
            <div className="px-3.5 py-1.5 bg-surface text-center">
              <p className="text-[10px] font-medium text-text-tertiary">
                {mode === "horizontal" && selectedPhotos.length > 1
                  ? "↔ Scroll sideways to preview full roll"
                  : mode === "vertical" && selectedPhotos.length > 1
                    ? "↕ Scroll down to preview full strip"
                    : mode === "frames" && selectedPhotos.length > 1
                      ? "↔ Swipe across to preview each frame"
                      : "Ready to export & share"}
              </p>
            </div>
          )}
        </div>

        {/* Layout mode switcher */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Layout Format
          </label>
          <div className="flex gap-1 rounded-xl bg-surface-secondary p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all ${
                  mode === m.value
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-text-tertiary">
            {mode === "horizontal"
              ? "Continuous panoramic film roll — great for wide story banners."
              : mode === "vertical"
                ? "Classic photobooth vertical strip — best for single phone screens."
                : "Each photo exported as its own standalone 35mm slide frame."}
          </p>
        </div>

        {/* Photo Selection Grid */}
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Tap photos to include ({selectedPhotos.length}/{MAX_FRAMES})
          </span>
          {photos.length > 0 && (
            <button
              type="button"
              onClick={handleResetOrSelectAll}
              className="text-xs font-semibold text-accent hover:text-accent/80 transition"
            >
              {selectedIds.length > 0
                ? "Deselect All"
                : `Select All (${Math.min(photos.length, MAX_FRAMES)})`}
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
              const selectedIndex = selectedIds.indexOf(photo.id);
              const isSelected = selectedIndex !== -1;
              const atCap = selectedIds.length >= MAX_FRAMES && !isSelected;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => toggle(photo.id)}
                  disabled={atCap}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    isSelected
                      ? "border-accent ring-2 ring-accent/30 shadow-md"
                      : "border-transparent"
                  } ${atCap ? "opacity-35 cursor-not-allowed" : "opacity-100 active:scale-95"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo by ${photo.guestName}`}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow ${
                      isSelected
                        ? "bg-accent text-white"
                        : "bg-black/40 text-white/90 backdrop-blur-sm"
                    }`}
                  >
                    {isSelected ? <span>{selectedIndex + 1}</span> : null}
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
