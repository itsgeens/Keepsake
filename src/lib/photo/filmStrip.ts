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

export type FilmOrientation = "horizontal" | "vertical";

const FILM = "#121110";
const STAMP = "#ff9f0a";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const OUTER = 24; // white margin around the dark film strip

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function sprocketRow(ctx: CanvasRenderingContext2D, y: number, width: number) {
  const holeW = 12;
  const holeH = 16;
  const step = 22;
  ctx.fillStyle = "#050505";
  for (let x = 10; x < width - holeW; x += step) {
    roundRect(ctx, x, y, holeW, holeH, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.stroke();
  }
}

function sprocketCol(ctx: CanvasRenderingContext2D, x: number, height: number) {
  const holeW = 16;
  const holeH = 12;
  const step = 22;
  ctx.fillStyle = "#050505";
  for (let y = 10; y < height - holeH; y += step) {
    roundRect(ctx, x, y, holeW, holeH, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.stroke();
  }
}

// Draw a single photo into a frame cell (border + cover-crop + corner id).
// Sprockets are drawn by the caller around the whole composition.
function paintCell(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  fw: number,
  fh: number,
  index: number,
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 3, y - 3, fw + 6, fh + 6);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, fw, fh);
  ctx.clip();

  const iw = image.width;
  const ih = image.height;
  const scale = Math.max(fw / iw, fh / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (fw - dw) / 2;
  const dy = y + (fh - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  const id = String(index + 1).padStart(2, "0");
  ctx.fillStyle = STAMP;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(`${id}A`, x + fw - 30, y + fh - 8);
}

// White background with the dark film strip drawn as an inset panel, so the
// strip's edges/borders read clearly against the white surround.
function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  filmW: number,
  filmH: number,
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, filmW + OUTER * 2, filmH + OUTER * 2);
  ctx.fillStyle = FILM;
  ctx.fillRect(OUTER, OUTER, filmW, filmH);
  ctx.save();
  ctx.translate(OUTER, OUTER);
}

export interface StripOptions {
  orientation?: FilmOrientation;
  stampText?: string;
  dateStamp?: string;
}

// Render a combined film strip (one image) in either orientation. Each frame
// keeps its own baked-in film look — we never re-tint.
export async function renderFilmStrip(
  canvas: HTMLCanvasElement,
  images: Array<HTMLImageElement | HTMLCanvasElement>,
  options: StripOptions = {},
): Promise<void> {
  const orientation = options.orientation ?? "horizontal";
  const stampText = (options.stampText ?? "WEDDING").toUpperCase();
  const dateStamp = options.dateStamp;

  if (images.length === 0) throw new Error("No frames selected");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const FW = 280;
  const FH = 200;
  const MARGIN = 38;
  const SPACING = 16;

  let filmW: number;
  let filmH: number;
  if (orientation === "horizontal") {
    filmW = FW * images.length + SPACING * (images.length + 1);
    filmH = FH + MARGIN * 2;
  } else {
    filmW = FW + MARGIN * 2;
    filmH = MARGIN + images.length * FH + (images.length - 1) * SPACING + MARGIN;
  }

  paintBackdrop(ctx, filmW, filmH);

  if (orientation === "horizontal") {
    sprocketRow(ctx, 8, filmW);
    sprocketRow(ctx, filmH - 24, filmW);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = STAMP;
    ctx.globalAlpha = 0.9;
    ctx.fillText(`FILM STRIP  •  ${stampText}`, 16, 32);
    ctx.globalAlpha = 1;

    images.forEach((img, i) => {
      const x = SPACING + i * (FW + SPACING);
      const y = MARGIN;
      paintCell(ctx, img, x, y, FW, FH, i);
      ctx.fillStyle = STAMP;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(`► ${String(i + 1).padStart(2, "0")}A`, x + 8, filmH - 10);
      if (dateStamp) ctx.fillText(dateStamp, x + FW - 70, filmH - 10);
    });
  } else {
    sprocketCol(ctx, 8, filmH);
    sprocketCol(ctx, filmW - 24, filmH);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = STAMP;
    ctx.globalAlpha = 0.9;
    ctx.fillText(`FILM STRIP  •  ${stampText}`, MARGIN, 30);
    ctx.globalAlpha = 1;

    images.forEach((img, i) => {
      const x = MARGIN;
      const y = MARGIN + i * (FH + SPACING);
      paintCell(ctx, img, x, y, FW, FH, i);
      if (dateStamp) {
        ctx.fillStyle = STAMP;
        ctx.font = `10px ${MONO}`;
        ctx.fillText(dateStamp, x + 6, y + 14);
      }
    });
  }

  ctx.restore();
}

export interface FrameOptions {
  stampText?: string;
  dateStamp?: string;
  index?: number;
}

// Render a single standalone film frame (its own sprockets top & bottom) on a
// white background, for the per-photo export mode.
export async function renderFilmFrame(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
  options: FrameOptions = {},
): Promise<void> {
  const stampText = (options.stampText ?? "WEDDING").toUpperCase();
  const dateStamp = options.dateStamp;
  const index = options.index ?? 0;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const FW = 320;
  const FH = 240;
  const MARGIN = 34;
  const PAD = 14;
  const filmW = FW + PAD * 2;
  const filmH = FH + MARGIN * 2;

  paintBackdrop(ctx, filmW, filmH);

  sprocketRow(ctx, 8, filmW);
  sprocketRow(ctx, filmH - 24, filmW);
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = STAMP;
  ctx.globalAlpha = 0.9;
  ctx.fillText(`FILM STRIP  •  ${stampText}`, PAD, 26);
  ctx.globalAlpha = 1;

  paintCell(ctx, image, PAD, MARGIN, FW, FH, index);
  ctx.fillStyle = STAMP;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(`► ${String(index + 1).padStart(2, "0")}A`, PAD + 8, filmH - 10);
  if (dateStamp) ctx.fillText(dateStamp, PAD + FW - 70, filmH - 10);

  ctx.restore();
}
