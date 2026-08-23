// Export rendered canvases. On mobile the Web Share API is the only reliable
// way to send images straight into the phone's photo gallery or an Instagram
// Story carousel (sharing multiple files becomes a swipeable carousel).
// We fall back to a PNG download, or a ZIP when there are several files.

import JSZip from "jszip";

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
    );
  });
}

export type ExportResult = "shared" | "downloaded" | "cancelled";

async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) void triggerDownload(blob, filename);
  }, "image/png");
}

async function downloadCanvasesZip(
  canvases: HTMLCanvasElement[],
  baseFilename: string,
) {
  const zip = new JSZip();
  const blobs = await Promise.all(canvases.map(canvasToBlob));
  blobs.forEach((b, i) => zip.file(`${baseFilename}-${i + 1}.png`, b));
  const content = await zip.generateAsync({ type: "blob" });
  await triggerDownload(content, `${baseFilename}.zip`);
}

// Download one canvas, or a ZIP of several.
export async function downloadCanvases(
  canvases: HTMLCanvasElement[],
  baseFilename: string,
) {
  if (canvases.length === 1) {
    downloadCanvas(canvases[0], `${baseFilename}-1.png`);
    return;
  }
  await downloadCanvasesZip(canvases, baseFilename);
}

// Share (with download fallback) one or several canvases. Sharing multiple
// files lets the OS offer them as a Story/photo carousel.
export async function shareOrDownloadCanvases(
  canvases: HTMLCanvasElement[],
  baseFilename: string,
  title: string,
): Promise<ExportResult> {
  if (canvases.length === 0) return "cancelled";

  const blobs = await Promise.all(canvases.map(canvasToBlob));
  const fileList = blobs.map(
    (b, i) => new File([b], `${baseFilename}-${i + 1}.png`, { type: "image/png" }),
  );

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };

  if (nav.canShare && nav.share && nav.canShare({ files: fileList })) {
    try {
      await nav.share({ files: fileList, title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // fall through to download
    }
  }

  await downloadCanvases(canvases, baseFilename);
  return "downloaded";
}
