"use client";

import { Download, X } from "lucide-react";
import { formatTime } from "@/lib/format";

export interface RollPhoto {
  id: string;
  guestName: string;
  url: string;
  capturedAt: string;
}

interface PhotoDetailModalProps {
  photo: RollPhoto | null;
  onClose: () => void;
}

function savePhoto(url: string, filename: string) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => {});
}

export default function PhotoDetailModal({
  photo,
  onClose,
}: PhotoDetailModalProps) {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 p-4 sm:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top bar with close button */}
      <div className="flex items-center justify-between pt-[max(env(safe-area-inset-top),8px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo view"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            savePhoto(photo.url, `wedding-photo-${photo.id}.jpg`);
          }}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Save</span>
        </button>
      </div>

      {/* Main photo container */}
      <div
        className="animate-fade-in-scale my-auto flex max-h-[75vh] w-full max-w-lg items-center justify-center self-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={`Photo by ${photo.guestName}`}
          className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>

      {/* Bottom metadata bar */}
      <div
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-1 pb-[max(env(safe-area-inset-bottom),12px)] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white/95">
          {photo.guestName}
        </p>
        <p className="text-xs text-white/50">
          {formatTime(new Date(photo.capturedAt))}
        </p>
      </div>
    </div>
  );
}
