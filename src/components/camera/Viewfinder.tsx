"use client";

import {
  RefreshCw,
  Zap,
  ZapOff,
  AlertTriangle,
  Images,
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
  onToggleFilmStyle: () => void;
  onShutter: () => void;
  onFileSelected: (file: File) => void;
  onViewRoll?: () => void;
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
  onToggleFilmStyle,
  onShutter,
  onFileSelected,
  onViewRoll,
}: ViewfinderProps) {
  return (
    <div className="flex h-dvh w-full flex-col bg-black">
      {/* ─── Viewfinder ─── */}
      <div className="relative flex-1 overflow-hidden">
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

        {/* Film overlays */}
        <div className="film-grain pointer-events-none absolute inset-0" />
        <div className="film-vignette pointer-events-none absolute inset-0" />

        {/* Center focus bracket */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-16 w-16">
            {/* Top-left */}
            <span className="absolute left-0 top-0 h-4 w-4 border-l-[1.5px] border-t-[1.5px] border-white/60" />
            {/* Top-right */}
            <span className="absolute right-0 top-0 h-4 w-4 border-r-[1.5px] border-t-[1.5px] border-white/60" />
            {/* Bottom-left */}
            <span className="absolute bottom-0 left-0 h-4 w-4 border-b-[1.5px] border-l-[1.5px] border-white/60" />
            {/* Bottom-right */}
            <span className="absolute bottom-0 right-0 h-4 w-4 border-b-[1.5px] border-r-[1.5px] border-white/60" />
          </div>
        </div>

        {/* Top status bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),12px)]">
          <span className="text-[11px] font-medium text-white/80">
            {coupleName}
          </span>
          <span className="text-[11px] font-medium text-white/80">
            {eventDate}
          </span>
        </div>

        {/* Mid-level controls: flash + focal length (decorative) + flip */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onToggleFlash}
            aria-label="Toggle flash"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          >
            {flashMode === "auto" ? (
              <Zap className="h-3.5 w-3.5 text-accent" />
            ) : (
              <ZapOff className="h-3.5 w-3.5 text-white/70" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFilmStyle}
            aria-label="Toggle film style"
            className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            {filmStyle === "mono" ? "B&W" : "Color"}
          </button>

          <button
            type="button"
            onClick={onFlip}
            aria-label="Flip camera"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>

        {/* Camera loading state */}
        {!streaming && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <span className="text-sm text-white/50">Starting camera…</span>
          </div>
        )}

        {/* Camera error / fallback */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-accent" />
            <p className="text-sm text-white/80">
              Camera unavailable
            </p>
            <label className="cursor-pointer rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black">
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

        {/* Flash overlay */}
        <div
          className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${
            flashActive ? "opacity-90" : "opacity-0"
          }`}
        />
      </div>

      {/* ─── Bottom controls bar ─── */}
      <div className="bg-black px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-5">
        {/* Shots counter */}
        <div className="mb-4 flex items-center justify-center">
          <span className="text-[12px] font-semibold tracking-wide text-accent">
            {shotsLeft} shots left
          </span>
        </div>

        {/* Control row: gallery thumbnail – shutter – flip */}
        <div className="flex items-center justify-between">
          {/* Gallery thumbnail / view roll */}
          <button
            type="button"
            onClick={onViewRoll}
            aria-label="View wedding roll"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm"
          >
            <Images className="h-5 w-5 text-white/70" />
          </button>

          {/* Shutter button — clean circular, accent ring */}
          <button
            type="button"
            onClick={onShutter}
            disabled={shotsLeft <= 0}
            aria-label="Take photo"
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full disabled:opacity-30"
          >
            {/* Outer ring */}
            <span className="absolute inset-0 rounded-full border-[3px] border-white/90" />
            {/* Inner circle */}
            <span className="h-[58px] w-[58px] rounded-full bg-white transition-transform active:scale-90" />
          </button>

          {/* Flip camera */}
          <button
            type="button"
            onClick={onFlip}
            aria-label="Flip camera"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
          >
            <RefreshCw className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
