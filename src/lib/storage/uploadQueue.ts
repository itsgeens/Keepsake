import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueuedPhotoStatus = "pending" | "uploading" | "failed" | "completed";

export interface QueuedPhoto {
  id: string;
  eventId: string;
  token: string;
  guestId: string;
  guestName: string;
  processedBlob: Blob;
  originalBlob?: Blob | null;
  capturedAt: string;
  status: QueuedPhotoStatus;
  attempts?: number;
  error?: string | null;
}

interface WeddingDB extends DBSchema {
  photo_queue: {
    key: string;
    value: QueuedPhoto;
    indexes: { byStatus: string };
  };
}

let dbPromise: Promise<IDBPDatabase<WeddingDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WeddingDB>("wedding-camera", 1, {
      upgrade(db) {
        const store = db.createObjectStore("photo_queue", { keyPath: "id" });
        store.createIndex("byStatus", "status");
      },
    });
  }
  return dbPromise;
}

export async function enqueuePhoto(photo: QueuedPhoto): Promise<void> {
  const db = await getDB();
  await db.put("photo_queue", photo);
}

export async function getPendingPhotos(
  eventId?: string,
): Promise<QueuedPhoto[]> {
  const db = await getDB();
  const pending = await db.getAllFromIndex(
    "photo_queue",
    "byStatus",
    "pending",
  );
  const failed = await db.getAllFromIndex("photo_queue", "byStatus", "failed");
  const items = [...pending, ...failed];
  if (eventId) return items.filter((p) => p.eventId === eventId);
  return items;
}

export async function markPhotoStatus(
  id: string,
  status: QueuedPhotoStatus,
  error?: string,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("photo_queue", id);
  if (!existing) return;
  existing.status = status;
  if (error !== undefined) existing.error = error;
  if (status === "failed") existing.attempts = (existing.attempts ?? 0) + 1;
  await db.put("photo_queue", existing);
}

export async function removePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("photo_queue", id);
}
