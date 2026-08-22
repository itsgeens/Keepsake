export type FilmStyle = "mono" | "fuji";

export interface FilmOptions {
  maxDimension?: number;
  dateStamp?: string;
  style?: FilmStyle;
  grainOpacity?: number;
  contrast?: number;
  brightness?: number;
  saturation?: number;
  sepia?: number;
  vignette?: number;
}

const DEFAULTS = {
  maxDimension: 2048,
  grainOpacity: 0.07,
  contrast: 1.12,
  brightness: 0.98,
  saturation: 0,
  sepia: 0,
  vignette: 0.45,
};

async function resolveSource(
  source: CanvasImageSource | Blob,
): Promise<{ src: CanvasImageSource; width: number; height: number }> {
  if (source instanceof Blob) {
    const bitmap = await createImageBitmap(source);
    return { src: bitmap, width: bitmap.width, height: bitmap.height };
  }

  const s = source as CanvasImageSource & {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  };

  const width =
    s.naturalWidth ?? s.videoWidth ?? s.width ?? undefined;
  const height =
    s.naturalHeight ?? s.videoHeight ?? s.height ?? undefined;

  if (!width || !height) {
    throw new Error("Could not determine image dimensions");
  }
  return { src: source, width, height };
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity: number,
) {
  const grain = document.createElement("canvas");
  grain.width = width;
  grain.height = height;
  const gctx = grain.getContext("2d");
  if (!gctx) return;

  const imageData = gctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 70);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  gctx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(grain, 0, 0);
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
) {
  const grad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(20,16,12,${strength})`);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDateStamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
) {
  const size = Math.max(18, Math.round(Math.min(width, height) * 0.045));
  ctx.save();
  ctx.font = `${size}px "Courier Prime", "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(226,157,18,0.6)";
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = "#E29D12";
  ctx.fillText(text, width - size * 0.6, height - size * 0.5);
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      0.85,
    );
  });
}

function applyMonochrome(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast: number,
  brightness: number,
) {
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const bOffset = (brightness - 1) * 255;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let l = 0.299 * r + 0.587 * g + 0.114 * b;
    l = (l - 128) * contrast + 128 + bOffset;
    if (l < 0) l = 0;
    else if (l > 255) l = 255;
    data[i] = data[i + 1] = data[i + 2] = l;
  }
  ctx.putImageData(img, 0, 0);
}

// Retro color film (Fuji-like): muted saturation, warm tone, punchy but deep
// greens, gentle contrast. Done per-pixel so it works on every browser.
function applyFuji(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast: number,
  brightness: number,
) {
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const bOffset = (brightness - 1) * 255;
  const sat = 0.82; // muted, filmic color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    let nr = luma + (r - luma) * sat;
    let ng = luma + (g - luma) * sat;
    let nb = luma + (b - luma) * sat;

    // Warm tone (lift reds, pull blues)
    nr += 14;
    nb -= 8;
    // Deep, rich greens
    ng += 12;
    if (g > r && g > b) nb -= 4; // cool the blues where green dominates

    // Contrast + brightness
    nr = (nr - 128) * contrast + 128 + bOffset;
    ng = (ng - 128) * contrast + 128 + bOffset;
    nb = (nb - 128) * contrast + 128 + bOffset;

    data[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
  ctx.putImageData(img, 0, 0);
}

export interface ProcessedPhoto {
  blob: Blob;
  dataUrl: string;
}

export async function processFilmPhoto(
  source: CanvasImageSource | Blob,
  options: FilmOptions = {},
): Promise<ProcessedPhoto> {
  const opts = { ...DEFAULTS, ...options };
  const { src, width, height } = await resolveSource(source);

  const scale = Math.min(1, opts.maxDimension / Math.max(width, height));
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  // 1. Draw the source, then convert to the chosen film look by manipulating
  //    pixels directly. We deliberately avoid ctx.filter so the saved file is
  //    correct even on browsers where Canvas filter is unsupported (e.g. older
  //    iOS Safari). The live preview uses a CSS filter, which works everywhere.
  ctx.drawImage(src, 0, 0, dw, dh);
  if (opts.style === "fuji") {
    applyFuji(ctx, dw, dh, opts.contrast, opts.brightness);
  } else {
    applyMonochrome(ctx, dw, dh, opts.contrast, opts.brightness);
  }

  // 2. Procedural film grain (heavier for the grainy B&W look)
  drawGrain(ctx, dw, dh, opts.grainOpacity);

  // 3. Vignette
  drawVignette(ctx, dw, dh, opts.vignette);

  // 4. Retro date stamp
  if (opts.dateStamp) drawDateStamp(ctx, dw, dh, opts.dateStamp);

  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { blob, dataUrl };
}
