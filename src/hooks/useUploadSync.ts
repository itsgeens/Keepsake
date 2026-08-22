"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getPendingPhotos,
  markPhotoStatus,
  removePhoto,
  type QueuedPhoto,
} from "@/lib/storage/uploadQueue";

export function useUploadSync(eventId?: string, token?: string) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);
  const supabase = useRef(createClient());
  // Waiters that resolve when a specific queued photo finishes uploading.
  const waitersRef = useRef(
    new Map<string, { resolve: () => void; reject: (e: Error) => void }>(),
  );

  const refreshCount = useCallback(async () => {
    const items = await getPendingPhotos(eventId);
    setPendingCount(items.length);
  }, [eventId]);

  const sync = useCallback(async () => {
    if (syncInFlight.current || typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }
    syncInFlight.current = true;
    setSyncing(true);
    try {
      const items = await getPendingPhotos(eventId);
      for (const item of items) {
        if (item.status === "uploading") continue;
        await uploadOne(item);
      }
    } finally {
      await refreshCount();
      setSyncing(false);
      syncInFlight.current = false;
    }
  }, [eventId, refreshCount]);

  const uploadOne = useCallback(
    async (item: QueuedPhoto) => {
      await markPhotoStatus(item.id, "uploading");
      try {
        const path = `${item.eventId}/processed/${item.id}.jpg`;
        const { error: upErr } = await supabase.current.storage
          .from("wedding-photos")
          .upload(path, item.processedBlob, {
            contentType: "image/jpeg",
            upsert: true,
            cacheControl: "3600",
          });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.current.from("photos").insert({
          event_id: item.eventId,
          guest_id: item.guestId,
          guest_name: item.guestName,
          processed_path: path,
          status: "uploaded",
          captured_at: item.capturedAt,
        });
        if (dbErr) throw dbErr;

        await removePhoto(item.id);
        const waiter = waitersRef.current.get(item.id);
        if (waiter) {
          waiter.resolve();
          waitersRef.current.delete(item.id);
        }
      } catch (e) {
        await markPhotoStatus(
          item.id,
          "failed",
          e instanceof Error ? e.message : "upload failed",
        );
        const waiter = waitersRef.current.get(item.id);
        if (waiter) {
          waiter.reject(e instanceof Error ? e : new Error("upload failed"));
          waitersRef.current.delete(item.id);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void refreshCount();
    void sync();

    const interval = setInterval(() => void sync(), 8000);
    const onOnline = () => void sync();

    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [refreshCount, sync]);

  // Resolve when the queued photo with `id` has been uploaded (or reject on
  // failure). The waiter must be registered before the photo is enqueued.
  const waitForUpload = useCallback((id: string) => {
    return new Promise<void>((resolve, reject) => {
      waitersRef.current.set(id, { resolve, reject });
    });
  }, []);

  return { pendingCount, syncing, sync, waitForUpload };
}
