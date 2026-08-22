"use client";

import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  AlertTriangle,
} from "lucide-react";
import type { RefObject } from "react";
import type { FilmStyle } from "@/lib/photo/filmProcessor";

type FlashMode = "auto" | "off";

interface ViewfinderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  facingMode: "user" | "environment";
  flashMode: FlashMode;
  flashActive: boolean;
  streaming: boolean;
  cameraError: boolean;
  shotsLeft: number;
  coupleName: string;
  eventDate: string;
  filmStyle: FilmStyle;
  onFlip: () => void;
  onToggleFlash: () => void;
  onShutter: () => void;
  onFileSelected: (file: File) => void;
}

function CornerTick({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-6 w-6 border-white/80 ${className}`}
    />
  );
}

export default function Viewfinder({
  videoRef,
  facingMode,
  flashMode,
  flashActive,
  streaming,
  cameraError,
  shotsLeft,
  coupleName,
  eventDate,
  filmStyle,
  onFlip,
  onToggleFlash,
  onShutter,
  onFileSelected,
}: ViewfinderProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between px-1">
        <div className="leading-tight">
          <p className="font-serif text-lg text-charcoal">{coupleName}</p>
          <p className="date-stamp text-xs">{eventDate}</p>
        </div>
        <span className="rounded-full bg-wine px-3 py-1 font-mono text-xs font-semibold text-paper">
          {shotsLeft} SHOTS LEFT
        </span>
      </div>

      {/* Viewfinder frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-charcoal/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${
            filmStyle === "fuji" ? "film-filter-fuji" : "film-filter"
          }`}
          style={{
            transform: facingMode === "user" ? "scaleX(-1)" : undefined,
          }}
        />

        {/* Live film treatment overlays */}
        <div className="film-grain pointer-events-none absolute inset-0" />
        <div className="film-vignette pointer-events-none absolute inset-0" />
        <span className="date-stamp pointer-events-none absolute bottom-3 right-6 text-xs">
          {eventDate}
        </span>

        {!streaming && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/80">
            <span className="font-mono text-xs text-paper/80">Starting camera…</span>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal/85 p-6 text-center">
            <AlertTriangle className="h-7 w-7 text-stamp-yellow" />
            <p className="font-sans text-sm text-paper">
              Camera unavailable. Choose a photo instead.
            </p>
            <label className="cursor-pointer rounded-full bg-wine px-5 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-paper">
              Choose Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelected(file);
                }}
              />
            </label>
          </div>
        )}

        {/* Corner ticks */}
        <CornerTick className="left-3 top-3 border-l-2 border-t-2" />
        <CornerTick className="right-3 top-3 border-r-2 border-t-2" />
        <CornerTick className="bottom-3 left-3 border-b-2 border-l-2" />
        <CornerTick className="bottom-3 right-3 border-b-2 border-r-2" />

        {/* Center focus circle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-20 w-20 rounded-full border border-white/50">
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
          </div>
        </div>

        {/* Film labels */}
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest text-white/80">
          ISO 400 FILM
        </span>
        <span className="pointer-events-none absolute right-3 top-10 font-mono text-[10px] tracking-widest text-white/80">
          EXP. 07/25
        </span>

        {/* Flash overlay */}
        <div
          className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${
            flashActive ? "opacity-90" : "opacity-0"
          }`}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip camera"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-paper-border bg-paper-card text-charcoal shadow-sm"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onShutter}
          disabled={shotsLeft <= 0}
          aria-label="Take photo"
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400 p-1 shadow-lg disabled:opacity-40"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-zinc-100 to-zinc-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wine shadow-inner">
              <Camera className="h-6 w-6 text-paper" />
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleFlash}
          aria-label="Toggle flash"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-paper-border bg-paper-card text-charcoal shadow-sm"
        >
          {flashMode === "auto" ? (
            <Zap className="h-5 w-5 text-wine" />
          ) : (
            <ZapOff className="h-5 w-5" />
          )}
        </button>
      </div>

      <p className="text-center font-sans text-[11px] uppercase tracking-widest text-charcoal-muted">
        Flash: {flashMode}
      </p>
    </div>
  );
}
