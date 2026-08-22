"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchEventByToken } from "@/lib/supabase/events";
import { useGuestSession, getStoredSession } from "@/hooks/useGuestSession";
import { useUploadSync } from "@/hooks/useUploadSync";
import { formatEventDate, formatTime } from "@/lib/format";
import { Camera } from "lucide-react";
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
    <main className="paper-texture min-h-full px-4 py-8">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-2xl text-charcoal">{coupleName}</h1>
        <p className="mt-1 font-mono text-[11px] tracking-[0.3em] text-charcoal-muted">
          {eventDate} · OUR WEDDING ROLL
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-charcoal-muted">
          <span>{photos.length} PHOTOS</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-wine-light px-2 py-0.5 text-wine">
              {pendingCount} SYNCING…
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto mt-5 flex max-w-2xl justify-center gap-2">
        {(["all", "mine"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-widest transition-colors ${
              filter === tab
                ? "bg-charcoal text-paper"
                : "border border-paper-border bg-paper-card text-charcoal-muted"
            }`}
          >
            {tab === "all" ? "All" : "Mine"}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-2xl columns-2 gap-3 [column-fill:_balance]">
        {loading ? (
          <p className="col-span-2 text-center font-mono text-[11px] tracking-widest text-charcoal-muted">
            LOADING ROLL…
          </p>
        ) : visiblePhotos.length === 0 ? (
          <p className="col-span-2 text-center font-mono text-[11px] tracking-widest text-charcoal-muted">
            NO PHOTOS YET — BE THE FIRST TO SHOOT.
          </p>
        ) : (
          visiblePhotos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(photo)}
              className={`polaroid-frame mb-3 block w-full break-inside-avoid ${
                i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Photo by ${photo.guestName}`}
                className="w-full bg-charcoal/5"
                loading="lazy"
              />
              <div className="flex items-center justify-between px-3 pb-3 pt-2 font-mono text-[9px] uppercase tracking-widest text-charcoal-muted">
                <span>{photo.guestName}</span>
                <span>{formatTime(new Date(photo.capturedAt))}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(`/camera/${token}/shoot`)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-wine px-5 py-3 font-sans text-[11px] font-semibold uppercase tracking-widest text-paper shadow-lg transition-opacity hover:opacity-90"
      >
        <Camera className="h-4 w-4" />
        Take a Photo
      </button>

      <PhotoDetailModal photo={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
