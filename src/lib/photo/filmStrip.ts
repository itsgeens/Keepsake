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

const FILM = "#141311";
const STAMP = "#ff9f0a";
const STAMP_MUTED = "#cf8513";
const SPROCKET = "#080706";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace';
const OUTER = 18; // Crisp margin around the film strip for contrast

function roundRect(
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

function sprocketRow(ctx: CanvasRenderingContext2D, y: number, width: number) {
  const holeW = 13;
  const holeH = 17;
  const step = 23;
  ctx.fillStyle = SPROCKET;
  for (let x = 12; x < width - holeW; x += step) {
    roundRect(ctx, x, y, holeW, holeH, 3.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function sprocketCol(ctx: CanvasRenderingContext2D, x: number, height: number) {
  const holeW = 17;
  const holeH = 13;
  const step = 23;
  ctx.fillStyle = SPROCKET;
  for (let y = 12; y < height - holeH; y += step) {
    roundRect(ctx, x, y, holeW, holeH, 3.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Draw a single photo into a frame cell (border + cover-crop + corner id).
function paintCell(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  fw: number,
  fh: number,
  index: number,
) {
  // Film frame aperture rebate / bevel
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 3, y - 3, fw + 6, fh + 6);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.strokeRect(x - 3, y - 3, fw + 6, fh + 6);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, fw, fh);
  ctx.clip();

  const iw = image.width || 1;
  const ih = image.height || 1;
  const scale = Math.max(fw / iw, fh / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (fw - dw) / 2;
  const dy = y + (fh - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  // Subtle frame aperture highlight
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, fw, fh);

  // Frame stamp index
  const id = String(index + 1).padStart(2, "0");
  ctx.fillStyle = STAMP;
  ctx.font = `bold 10px ${MONO}`;
  ctx.fillText(`${id}A`, x + fw - 28, y + fh - 6);
}

// Crisp backdrop around the film strip for clean contrast & export
function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  filmW: number,
  filmH: number,
) {
  // Crisp white outer surround so sprockets and acetate edges pop cleanly
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, filmW + OUTER * 2, filmH + OUTER * 2);

  // Dark acetate film strip body
  ctx.fillStyle = FILM;
  roundRect(ctx, OUTER, OUTER, filmW, filmH, 4);
  ctx.fill();

  // Film rebate border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(OUTER, OUTER);
}

export interface StripOptions {
  orientation?: FilmOrientation;
  stampText?: string;
  dateStamp?: string;
}

// Render a combined film strip in horizontal or vertical orientation.
export async function renderFilmStrip(
  canvas: HTMLCanvasElement,
  images: Array<HTMLImageElement | HTMLCanvasElement>,
  options: StripOptions = {},
): Promise<void> {
  const orientation = options.orientation ?? "horizontal";
  const stampText = (options.stampText ?? "KEEPSAKE 35MM").toUpperCase();
  const dateStamp = options.dateStamp || "";

  if (images.length === 0) throw new Error("No frames selected");

  const FW = 340;
  const FH = 230;
  const MARGIN = 40;
  const SPACING = 18;

  let filmW: number;
  let filmH: number;

  if (orientation === "horizontal") {
    filmW = FW * images.length + SPACING * (images.length + 1);
    filmH = FH + MARGIN * 2;
  } else {
    filmW = FW + MARGIN * 2;
    filmH = MARGIN + images.length * FH + (images.length - 1) * SPACING + MARGIN;
  }

  const totalW = filmW + OUTER * 2;
  const totalH = filmH + OUTER * 2;

  // High-res retina canvas (2x)
  const DPR = 2;
  canvas.width = totalW * DPR;
  canvas.height = totalH * DPR;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  ctx.scale(DPR, DPR);

  paintBackdrop(ctx, filmW, filmH);

  if (orientation === "horizontal") {
    // Top and bottom continuous sprocket rows
    sprocketRow(ctx, 8, filmW);
    sprocketRow(ctx, filmH - 25, filmW);

    // Top film stock markings
    ctx.font = `bold 10px ${MONO}`;
    ctx.fillStyle = STAMP;
    ctx.globalAlpha = 0.95;
    ctx.fillText(`KODAK SAFETY FILM 400  •  ${stampText}`, 18, 33);
    ctx.globalAlpha = 1;

    images.forEach((img, i) => {
      const x = SPACING + i * (FW + SPACING);
      const y = MARGIN;
      paintCell(ctx, img, x, y, FW, FH, i);

      // Bottom frame markers
      ctx.fillStyle = STAMP;
      ctx.font = `bold 10px ${MONO}`;
      ctx.fillText(`► ${String(i + 1).padStart(2, "0")}A`, x + 6, filmH - 10);
      if (dateStamp) {
        ctx.fillStyle = STAMP_MUTED;
        ctx.font = `9px ${MONO}`;
        ctx.fillText(dateStamp, x + FW - 64, filmH - 10);
      }
    });
  } else {
    // Left and right continuous sprocket columns
    sprocketCol(ctx, 8, filmH);
    sprocketCol(ctx, filmW - 25, filmH);

    // Header stamp on top margin
    ctx.font = `bold 10px ${MONO}`;
    ctx.fillStyle = STAMP;
    ctx.globalAlpha = 0.95;
    ctx.fillText(`KODAK 35MM  •  ${stampText}`, MARGIN, 28);
    ctx.globalAlpha = 1;

    images.forEach((img, i) => {
      const x = MARGIN;
      const y = MARGIN + i * (FH + SPACING);
      paintCell(ctx, img, x, y, FW, FH, i);

      // Frame stamp & date on bottom margin of cell
      ctx.fillStyle = STAMP;
      ctx.font = `bold 10px ${MONO}`;
      ctx.fillText(`► ${String(i + 1).padStart(2, "0")}A`, x + 4, y - 6);
      if (dateStamp) {
        ctx.fillStyle = STAMP_MUTED;
        ctx.font = `9px ${MONO}`;
        ctx.fillText(dateStamp, x + FW - 60, y - 6);
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

// Render a single standalone film frame for per-photo export mode.
export async function renderFilmFrame(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
  options: FrameOptions = {},
): Promise<void> {
  const stampText = (options.stampText ?? "KEEPSAKE 35MM").toUpperCase();
  const dateStamp = options.dateStamp || "";
  const index = options.index ?? 0;

  const FW = 340;
  const FH = 230;
  const MARGIN = 38;
  const PAD = 16;
  const filmW = FW + PAD * 2;
  const filmH = FH + MARGIN * 2;

  const totalW = filmW + OUTER * 2;
  const totalH = filmH + OUTER * 2;

  // High-res retina canvas (2x)
  const DPR = 2;
  canvas.width = totalW * DPR;
  canvas.height = totalH * DPR;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  ctx.scale(DPR, DPR);

  paintBackdrop(ctx, filmW, filmH);

  sprocketRow(ctx, 8, filmW);
  sprocketRow(ctx, filmH - 25, filmW);

  ctx.font = `bold 10px ${MONO}`;
  ctx.fillStyle = STAMP;
  ctx.globalAlpha = 0.95;
  ctx.fillText(`KODAK SAFETY FILM  •  ${stampText}`, PAD, 29);
  ctx.globalAlpha = 1;

  paintCell(ctx, image, PAD, MARGIN, FW, FH, index);

  ctx.fillStyle = STAMP;
  ctx.font = `bold 10px ${MONO}`;
  ctx.fillText(`► ${String(index + 1).padStart(2, "0")}A`, PAD + 6, filmH - 10);
  if (dateStamp) {
    ctx.fillStyle = STAMP_MUTED;
    ctx.font = `9px ${MONO}`;
    ctx.fillText(dateStamp, PAD + FW - 64, filmH - 10);
  }

  ctx.restore();
}
