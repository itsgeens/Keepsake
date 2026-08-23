// Export a rendered canvas as a PNG. On mobile the Web Share API is the only
// reliable way to send the image straight into the phone's photo gallery
// (iOS/Android show a "Save Image" action). We fall back to a plain download
// when sharing isn't available.

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
    );
  });
}

export type ExportResult = "shared" | "downloaded" | "cancelled";

export async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  title: string,
): Promise<ExportResult> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };

  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Any other failure falls through to a normal download.
    }
  }

  downloadCanvas(canvas, filename);
  return "downloaded";
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
