"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/format";

interface DevelopingModalProps {
  open: boolean;
  image: string | null;
  guestName: string;
  onKeep: () => void;
  onRetake: () => void;
}

export default function DevelopingModal({
  open,
  image,
  guestName,
  onKeep,
  onRetake,
}: DevelopingModalProps) {
  const [developed, setDeveloped] = useState(false);

  useEffect(() => {
    if (!open || !image) return;
    setDeveloped(false);
    const timer = setTimeout(() => setDeveloped(true), 2800);
    return () => clearTimeout(timer);
  }, [open, image]);

  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-6">
      <div className="polaroid-frame w-full max-w-sm rotate-[-1deg]">
        <div className="relative overflow-hidden bg-charcoal/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Developing photo"
            className="polaroid-developing aspect-square w-full object-cover"
          />
          {/* Milky undeveloped sheet that fades as the photo emerges */}
          <div className="polaroid-sheet pointer-events-none absolute inset-0" />
        </div>

        <div className="px-2 pb-3 pt-3 text-center">
          {!developed ? (
            <p className="font-mono text-[11px] tracking-[0.25em] text-charcoal-muted">
              DEVELOPING FILM PROCESS...
            </p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-charcoal-muted">
                <span>BY {guestName}</span>
                <span>·</span>
                <span>{formatTime(new Date())}</span>
                <span className="rounded bg-wine-light px-1.5 py-0.5 text-wine">
                  ORIGINAL FILM
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onKeep}
                  className="w-full rounded-full bg-wine px-6 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-paper transition-opacity hover:opacity-90"
                >
                  Keep it &amp; Add to Roll
                </button>
                <button
                  type="button"
                  onClick={onRetake}
                  className="w-full rounded-full border border-paper-border bg-paper-card px-6 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-charcoal transition-colors hover:bg-paper"
                >
                  Retake Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
