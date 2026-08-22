"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Viewfinder from "@/components/camera/Viewfinder";
import DevelopingModal from "@/components/camera/DevelopingModal";
import { playShutterSound } from "@/lib/audio/shutterSound";
import { fetchEventByToken } from "@/lib/supabase/events";
import { processFilmPhoto, type ProcessedPhoto } from "@/lib/photo/filmProcessor";
import { useGuestSession, getStoredSession } from "@/hooks/useGuestSession";
import { useUploadSync } from "@/hooks/useUploadSync";
import { enqueuePhoto } from "@/lib/storage/uploadQueue";
import { formatEventDate } from "@/lib/format";
import type { EventRow } from "@/types/database";

function captureFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

export default function ShootPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const { session, setFilmStyle, decrementShots, incrementShots } =
    useGuestSession(token);
  const [event, setEvent] = useState<EventRow | null>(null);
  useUploadSync(event?.id, token);
  const [coupleName, setCoupleName] = useState("GINO + GABBY");
  const [eventDate, setEventDate] = useState("10.01.26");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [flashMode, setFlashMode] = useState<"auto" | "off">("auto");
  const [flashActive, setFlashActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processed, setProcessed] = useState<ProcessedPhoto | null>(null);
  const [showModal, setShowModal] = useState(false);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
        setStreaming(true);
      } catch {
        setCameraError(true);
        setStreaming(false);
      }
    },
    [],
  );

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

  useEffect(() => {
    if (session) startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function triggerFlash() {
    if (flashMode === "off") return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 220);
  }

  async function handleShutter() {
    if (!session || session.shotsLeft <= 0) return;
    playShutterSound();
    triggerFlash();

    const frame =
      videoRef.current && !cameraError
        ? captureFrame(videoRef.current)
        : null;
    if (!frame) return;

    decrementShots();
    try {
      const result = await processFilmPhoto(frame, {
        dateStamp: eventDate,
        style: session.filmStyle,
      });
      setProcessed(result);
      setCapturedImage(result.dataUrl);
    } catch {
      setCapturedImage(frame.toDataURL("image/jpeg", 0.9));
    }
    setShowModal(true);
  }

  function handleFileSelected(file: File) {
    if (!session || session.shotsLeft <= 0) return;
    (async () => {
      try {
        const result = await processFilmPhoto(file, {
          dateStamp: eventDate,
          style: session.filmStyle,
        });
        decrementShots();
        setProcessed(result);
        setCapturedImage(result.dataUrl);
        setShowModal(true);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          decrementShots();
          setCapturedImage(reader.result as string);
          setShowModal(true);
        };
        reader.readAsDataURL(file);
      }
    })();
  }

  async function handleKeep() {
    if (processed && session && event) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await enqueuePhoto({
        id,
        eventId: event.id,
        token,
        guestId: session.guestId,
        guestName: session.fullName,
        processedBlob: processed.blob,
        originalBlob: null,
        capturedAt: new Date().toISOString(),
        status: "pending",
      });
    }
    setShowModal(false);
    setCapturedImage(null);
    setProcessed(null);
    router.push(`/camera/${token}/roll`);
  }

  function handleRetake() {
    incrementShots();
    setShowModal(false);
    setCapturedImage(null);
    setProcessed(null);
    if (cameraError) startCamera(facingMode);
  }

  if (!session) return null;

  return (
    <main className="paper-texture flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10">
      <Viewfinder
        videoRef={videoRef}
        facingMode={facingMode}
        flashMode={flashMode}
        flashActive={flashActive}
        streaming={streaming}
        cameraError={cameraError}
        shotsLeft={session.shotsLeft}
        coupleName={coupleName}
        eventDate={eventDate}
        filmStyle={session.filmStyle}
        onFlip={() => {
          const next = facingMode === "environment" ? "user" : "environment";
          setFacingMode(next);
          startCamera(next);
        }}
        onToggleFlash={() =>
          setFlashMode((m) => (m === "auto" ? "off" : "auto"))
        }
        onShutter={handleShutter}
        onFileSelected={handleFileSelected}
      />

      <div className="flex w-full max-w-md items-center justify-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal-muted">
          Film
        </span>
        {(["mono", "fuji"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilmStyle(s)}
            className={`rounded-full px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-widest transition-colors ${
              session.filmStyle === s
                ? "bg-charcoal text-paper"
                : "border border-paper-border bg-paper-card text-charcoal-muted"
            }`}
          >
            {s === "mono" ? "Monochrome" : "Retro Color"}
          </button>
        ))}
      </div>

      <DevelopingModal
        open={showModal}
        image={capturedImage}
        guestName={session.fullName}
        onKeep={handleKeep}
        onRetake={handleRetake}
      />
    </main>
  );
}
