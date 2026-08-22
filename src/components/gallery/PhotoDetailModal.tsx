"use client";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/85 p-6"
      onClick={onClose}
    >
      <div
        className="polaroid-frame w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={`Photo by ${photo.guestName}`}
          className="w-full bg-charcoal/5"
        />
        <div className="flex items-center justify-between px-3 pb-4 pt-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-charcoal-muted">
            <div>BY {photo.guestName}</div>
            <div className="mt-0.5">{formatTime(new Date(photo.capturedAt))}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-3 pb-4">
          <button
            type="button"
            onClick={() =>
              savePhoto(photo.url, `wedding-camera-${photo.id}.jpg`)
            }
            className="w-full rounded-full bg-wine px-6 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-paper transition-opacity hover:opacity-90"
          >
            Save Photo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-paper-border bg-paper-card px-6 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-charcoal transition-colors hover:bg-paper"
          >
            Back to Roll
          </button>
        </div>
      </div>
    </div>
  );
}
