"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
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
    const timer = setTimeout(() => setDeveloped(true), 2400);
    return () => clearTimeout(timer);
  }, [open, image]);

  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div className="animate-fade-in-scale w-full max-w-sm space-y-5">
        {/* Photo */}
        <div className="relative overflow-hidden rounded-2xl bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Developing photo"
            className="developing-photo aspect-[3/4] w-full object-cover"
          />
          <div className="developing-sheet pointer-events-none absolute inset-0 rounded-2xl" />
        </div>

        {/* Status / metadata */}
        <div className="text-center">
          {!developed ? (
            <p className="text-sm font-medium text-white/50">
              Developing…
            </p>
          ) : (
            <p className="text-sm text-white/70">
              by {guestName} · {formatTime(new Date())}
            </p>
          )}
        </div>

        {/* Actions */}
        {developed && (
          <div className="animate-fade-in space-y-2">
            <button
              type="button"
              onClick={onKeep}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-black transition-opacity hover:opacity-80 active:opacity-70"
            >
              <Check className="h-4 w-4" />
              <span>Keep &amp; Add to Roll</span>
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/15"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
