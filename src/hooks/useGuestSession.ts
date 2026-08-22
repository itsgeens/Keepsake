import { useEffect, useState } from "react";
import type { FilmStyle } from "@/lib/photo/filmProcessor";

export interface GuestSession {
  guestId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  sessionId: string;
  shotsLeft: number;
  filmStyle: FilmStyle;
}

function storageKey(token: string) {
  return `wedding_guest_session_${token}`;
}

export function useGuestSession(token: string, photoLimit = 25) {
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(token));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GuestSession;
        setSession({ ...parsed, filmStyle: parsed.filmStyle ?? "mono" });
      } catch {
        localStorage.removeItem(storageKey(token));
      }
    }
  }, [token]);

  function saveSession(
    firstName: string,
    lastName: string,
    guestId: string,
    sessionId?: string,
    filmStyle: FilmStyle = "mono",
  ) {
    const next: GuestSession = {
      guestId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      sessionId: sessionId ?? crypto.randomUUID(),
      shotsLeft: photoLimit,
      filmStyle,
    };
    localStorage.setItem(storageKey(token), JSON.stringify(next));
    setSession(next);
    return next;
  }

  function setFilmStyle(filmStyle: FilmStyle) {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, filmStyle };
      localStorage.setItem(storageKey(token), JSON.stringify(updated));
      return updated;
    });
  }

  function decrementShots() {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, shotsLeft: Math.max(0, prev.shotsLeft - 1) };
      localStorage.setItem(storageKey(token), JSON.stringify(updated));
      return updated;
    });
  }

  function incrementShots() {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, shotsLeft: prev.shotsLeft + 1 };
      localStorage.setItem(storageKey(token), JSON.stringify(updated));
      return updated;
    });
  }

  function clearSession() {
    localStorage.removeItem(storageKey(token));
    setSession(null);
  }

  return {
    session,
    saveSession,
    setFilmStyle,
    decrementShots,
    incrementShots,
    clearSession,
  };
}

export function getStoredSession(token: string): GuestSession | null {
  const raw = localStorage.getItem(storageKey(token));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestSession;
    return { ...parsed, filmStyle: parsed.filmStyle ?? "mono" };
  } catch {
    return null;
  }
}
