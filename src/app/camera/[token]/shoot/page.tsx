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

function captureFrame(video: HTMLVideoElement, zoom = 1): HTMLCanvasElement | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  // Crop the centered region so the captured photo matches the zoomed preview.
  const sw = vw / zoom;
  const sh = vh / zoom;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
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
  const [flashMode, setFlashMode] = useState<"on" | "off">("off");
  const [flashActive, setFlashActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [nativeZoom, setNativeZoom] = useState(false);
  const zoomRange = useRef<{ min: number; max: number; step: number } | null>(
    null,
  );

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

        // Detect real (optical) zoom support and apply current flash/zoom.
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as any;
        const z = caps?.zoom;
        if (z && typeof z === "object" && "max" in z && z.max > 1) {
          zoomRange.current = {
            min: z.min ?? 1,
            max: z.max,
            step: z.step ?? 0.1,
          };
          setNativeZoom(true);
        } else {
          zoomRange.current = null;
          setNativeZoom(false);
        }
        track
          .applyConstraints({ advanced: [{ torch: flashMode === "on" }] } as any)
          .catch(() => {});
        if (zoomRange.current) {
          const val = Math.min(
            zoomRange.current.max,
            Math.max(zoomRange.current.min, zoom),
          );
          track
            .applyConstraints({ advanced: [{ zoom: val }] } as any)
            .catch(() => {});
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

  // Keep the real LED (torch) and optical zoom in sync with the chosen mode.
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track
      .applyConstraints({ advanced: [{ torch: flashMode === "on" }] } as any)
      .catch(() => {});
    if (nativeZoom && zoomRange.current) {
      const val = Math.min(
        zoomRange.current.max,
        Math.max(zoomRange.current.min, zoom),
      );
      track
        .applyConstraints({ advanced: [{ zoom: val }] } as any)
        .catch(() => {});
    }
  }, [flashMode, zoom, nativeZoom]);

  function triggerFlash() {
    if (flashMode === "off") return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);
  }

  async function handleShutter() {
    if (!session || session.shotsLeft <= 0) return;
    playShutterSound();
    triggerFlash();

  const frame =
    videoRef.current && !cameraError
      ? captureFrame(videoRef.current, nativeZoom ? 1 : zoom)
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
    <>
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
          setFlashMode((m) => (m === "on" ? "off" : "on"))
        }
        onToggleFilmStyle={() =>
          setFilmStyle(session.filmStyle === "mono" ? "fuji" : "mono")
        }
        zoom={zoom}
        nativeZoom={nativeZoom}
        onZoomIn={() => setZoom((z) => Math.min(3, Math.round((z + 0.5) * 10) / 10))}
        onZoomOut={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
        onShutter={handleShutter}
        onFileSelected={handleFileSelected}
        onViewRoll={() => router.push(`/camera/${token}/roll`)}
      />

      <DevelopingModal
        open={showModal}
        image={capturedImage}
        guestName={session.fullName}
        onKeep={handleKeep}
        onRetake={handleRetake}
      />
    </>
  );
}
