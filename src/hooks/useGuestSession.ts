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

function setSessionCookie(token: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${storageKey(token)}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function getSessionCookie(token: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${storageKey(token)}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function clearSessionCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${storageKey(token)}=; path=/; max-age=0`;
}

export function useGuestSession(token: string, photoLimit = 25) {
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    const parsed = getStoredSession(token);
    if (parsed) setSession(parsed);
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
    setSessionCookie(token, JSON.stringify(next));
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
    clearSessionCookie(token);
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
  const read = (raw: string | null): GuestSession | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as GuestSession;
      return { ...parsed, filmStyle: parsed.filmStyle ?? "mono" };
    } catch {
      return null;
    }
  };
  const fromStorage = read(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(storageKey(token))
      : null,
  );
  if (fromStorage) return fromStorage;
  const fromCookie = read(getSessionCookie(token));
  if (fromCookie) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey(token), JSON.stringify(fromCookie));
    }
    return fromCookie;
  }
  return null;
}
