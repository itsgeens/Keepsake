"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchEventByToken } from "@/lib/supabase/events";
import { useGuestSession, getStoredSession } from "@/hooks/useGuestSession";
import { useUploadSync } from "@/hooks/useUploadSync";
import { formatEventDate, formatTime } from "@/lib/format";
import { Camera, ArrowLeft } from "lucide-react";
import type { EventRow, PhotoRow } from "@/types/database";
import PhotoDetailModal, { type RollPhoto } from "@/components/gallery/PhotoDetailModal";

export default function RollPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const { session } = useGuestSession(token);
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<EventRow | null>(null);
  const { pendingCount } = useUploadSync(event?.id, token);
  const [coupleName, setCoupleName] = useState("GINO + GABBY");
  const [eventDate, setEventDate] = useState("10.01.26");
  const [photos, setPhotos] = useState<RollPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [selected, setSelected] = useState<RollPhoto | null>(null);

  useEffect(() => {
    if (!getStoredSession(token)) {
      router.replace(`/camera/${token}`);
    }
  }, [token, router]);

  useEffect(() => {
    fetchEventByToken(token).then((data) => {
      if (data) {
        setEvent(data);
        setCoupleName(data.couple_name);
        setEventDate(formatEventDate(data.event_date));
      }
    });
  }, [token]);

  const buildRollPhoto = useCallback(
    (row: PhotoRow): RollPhoto => ({
      id: row.id,
      guestName: row.guest_name,
      url: supabase.storage.from("wedding-photos").getPublicUrl(row.processed_path)
        .data.publicUrl,
      capturedAt: row.captured_at,
    }),
    [supabase],
  );

  const loadPhotos = useCallback(async () => {
    if (!event) return;
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPhotos(data.map((row) => buildRollPhoto(row as PhotoRow)));
    }
    setLoading(false);
  }, [event, supabase, buildRollPhoto]);

  useEffect(() => {
    if (event) void loadPhotos();
  }, [event, loadPhotos]);

  useEffect(() => {
    if (!event) return;
    const channel = supabase
      .channel(`photos-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const row = payload.new as PhotoRow;
          if (row.is_hidden) return;
          setPhotos((prev) =>
            prev.some((p) => p.id === row.id)
              ? prev
              : [buildRollPhoto(row), ...prev],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, supabase, buildRollPhoto]);

  const visiblePhotos = useMemo(() => {
    if (filter === "mine" && session) {
      return photos.filter((p) => p.guestName === session.fullName);
    }
    return photos;
  }, [filter, photos, session]);

  if (!session) return null;

  return (
    <main className="min-h-dvh bg-surface">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b border-separator bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(`/camera/${token}/shoot`)}
            className="flex items-center gap-1 text-sm font-medium text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Camera
          </button>
          <div className="text-center">
            <h1 className="text-[15px] font-semibold text-text-primary">{coupleName}</h1>
          </div>
          <span className="text-xs text-text-tertiary">{eventDate}</span>
        </div>
      </header>

      {/* ─── Section title & filter ─── */}
      <div className="mx-auto max-w-2xl px-4 pt-5 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Photos</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {photos.length} moments captured
              {pendingCount > 0 && (
                <span className="ml-2 text-accent">
                  · {pendingCount} syncing
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-secondary p-0.5">
            {(["all", "mine"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === tab
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary"
                }`}
              >
                {tab === "all" ? "All" : "Mine"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Photo grid ─── */}
      <div className="mx-auto max-w-2xl px-4 pb-24">
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-text-tertiary">Loading photos…</p>
          </div>
        ) : visiblePhotos.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Camera className="mx-auto h-10 w-10 text-text-tertiary" strokeWidth={1.2} />
            <p className="text-sm text-text-tertiary">
              No photos yet — be the first to shoot
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] overflow-hidden rounded-xl">
            {visiblePhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelected(photo)}
                className="group relative aspect-square overflow-hidden bg-surface-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Photo by ${photo.guestName}`}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Hover overlay with name */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white/90">
                    {photo.guestName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Floating camera button ─── */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center">
        <button
          type="button"
          onClick={() => router.push(`/camera/${token}/shoot`)}
          className="flex items-center gap-2 rounded-full bg-text-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-transform active:scale-95"
        >
          <Camera className="h-4 w-4" />
          Take a Photo
        </button>
      </div>

      <PhotoDetailModal photo={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
