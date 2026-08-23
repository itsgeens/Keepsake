// Load an image for canvas drawing without tainting it. String URLs are
// fetched as blobs first (mirrors the app's savePhoto helper) so we keep a
// same-origin object URL and can safely call toDataURL / toBlob afterwards.
export async function loadImageElement(
  src: string | Blob,
): Promise<HTMLImageElement> {
  let url: string;
  if (src instanceof Blob) {
    url = URL.createObjectURL(src);
  } else {
    const blob = await fetch(src).then((res) => {
      if (!res.ok) throw new Error("Failed to load image");
      return res.blob();
    });
    url = URL.createObjectURL(blob);
  }
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawSprockets(
  ctx: CanvasRenderingContext2D,
  totalWidth: number,
  yPos: number,
) {
  const holeW = 12;
  const holeH = 16;
  const step = 22;
  ctx.fillStyle = "#050505";
  for (let x = 10; x < totalWidth - holeW; x += step) {
    drawRoundRect(ctx, x, yPos, holeW, holeH, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.stroke();
  }
}

export interface FilmStripOptions {
  title?: string;
  dateStamp?: string;
}

// Render a horizontal 35mm-style film strip onto `canvas` from the supplied,
// already-decoded images. Each frame is drawn exactly as captured — its own
// baked-in film look (mono, fuji, or a raw gallery photo) is preserved; we do
// not re-tint frames. Throws if `images` is empty so callers can show a
// placeholder instead.
export async function renderFilmStrip(
  canvas: HTMLCanvasElement,
  images: Array<HTMLImageElement | HTMLCanvasElement>,
  options: FilmStripOptions = {},
): Promise<void> {
  const title = (options.title ?? "WEDDING").toUpperCase();
  const dateStamp = options.dateStamp;
  const stamp = "#ff9f0a";

  if (images.length === 0) {
    throw new Error("No frames selected");
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const frameWidth = 280;
  const frameHeight = 200;
  const margin = 38;
  const spacing = 16;

  const totalWidth =
    frameWidth * images.length + spacing * (images.length + 1);
  const totalHeight = frameHeight + margin * 2;

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  // Film base
  ctx.fillStyle = "#121110";
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Sprocket holes top & bottom
  drawSprockets(ctx, totalWidth, 8);
  drawSprockets(ctx, totalWidth, totalHeight - 24);

  // Header stamp
  ctx.font = '10px ui-monospace, "SFMono-Regular", Menlo, monospace';
  ctx.fillStyle = stamp;
  ctx.globalAlpha = 0.9;
  ctx.fillText(`FILM STRIP  •  ${title}`, 16, 32);
  ctx.globalAlpha = 1;

  // Frames — drawn as-is to preserve each photo's original film look.
  images.forEach((img, idx) => {
    const x = spacing + idx * (frameWidth + spacing);
    const y = margin;

    // Photo border
    ctx.fillStyle = "#000000";
    ctx.fillRect(x - 3, y - 3, frameWidth + 6, frameHeight + 6);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, frameWidth, frameHeight);
    ctx.clip();

    // Cover-crop the source into the frame without altering its colors.
    const iw = img.width;
    const ih = img.height;
    const scale = Math.max(frameWidth / iw, frameHeight / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (frameWidth - dw) / 2;
    const dy = y + (frameHeight - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // Frame labels
    ctx.fillStyle = stamp;
    ctx.font = '11px ui-monospace, "SFMono-Regular", Menlo, monospace';
    ctx.fillText(`► ${String(idx + 1).padStart(2, "0")}A`, x + 8, totalHeight - 10);
    if (dateStamp) {
      ctx.fillText(dateStamp, x + frameWidth - 70, totalHeight - 10);
    }
  });
}
