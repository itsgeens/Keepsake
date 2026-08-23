// Export helpers for the admin QR code. The QR is rendered with qrcode.react
// as an <svg>; we serialize it to a raster image so it can be composed onto a
// plain background or a styled "film negative" share card.

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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      "image/png",
    );
  });
}

async function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  // React renders SVG without an xmlns, but a standalone SVG needs it to load
  // as a raster image. Clone + inject the namespace before serializing.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const xml = new XMLSerializer().serializeToString(clone);
  const url =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  return img;
}

// Plain QR on a white square — scannable, no decoration.
export async function exportPlainQr(
  svg: SVGSVGElement,
  filename: string,
) {
  const img = await svgToImage(svg);
  const size = img.width || 600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  triggerDownload(await canvasToBlob(canvas), filename);
}

const FILM = "#141311";
const STAMP = "#ff9f0a";
const STAMP_MUTED = "#cf8513";
const SPROCKET = "#080706";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace';
const OUTER = 20;

function drawSprocketRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
) {
  const holeW = 13;
  const holeH = 17;
  const step = 23;
  ctx.fillStyle = SPROCKET;
  for (let x = 14; x < width - holeW; x += step) {
    roundRect(ctx, x, y, holeW, holeH, 3.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// QR composed onto an authentic 35mm film negative frame with top & bottom
// sprockets, edge stamps, photo rebate aperture, and scannable QR.
export async function exportFilmQr(
  svg: SVGSVGElement,
  filename: string,
  coupleName: string,
  eventDate: string,
) {
  const img = await svgToImage(svg);

  // 35mm Film Frame Proportions
  const filmW = 540;
  const filmH = 460;
  const totalW = filmW + OUTER * 2;
  const totalH = filmH + OUTER * 2;

  // High-res retina canvas (2x)
  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = totalW * DPR;
  canvas.height = totalH * DPR;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  ctx.scale(DPR, DPR);

  // Outer white margin for crisp contrast against any surface or print
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalW, totalH);

  // Dark acetate film body
  ctx.fillStyle = FILM;
  roundRect(ctx, OUTER, OUTER, filmW, filmH, 4);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(OUTER, OUTER);

  // Top & bottom continuous 35mm sprocket rows
  drawSprocketRow(ctx, filmW, 8);
  drawSprocketRow(ctx, filmW, filmH - 25);

  // Top film stock & event stamp
  const stampTitle = (coupleName || "KEEPSAKE").toUpperCase();
  ctx.font = `bold 11px ${MONO}`;
  ctx.fillStyle = STAMP;
  ctx.textAlign = "left";
  ctx.fillText(`KODAK SAFETY FILM 400  •  ${stampTitle}`, 16, 33);

  ctx.textAlign = "right";
  ctx.fillStyle = STAMP_MUTED;
  ctx.font = `9px ${MONO}`;
  ctx.fillText("ISO 400", filmW - 16, 33);

  // Center Photo Frame Aperture for QR
  const fw = 340;
  const fh = 340;
  const fx = (filmW - fw) / 2;
  const fy = 46;

  // Film aperture rebate / bevel
  ctx.fillStyle = "#000000";
  ctx.fillRect(fx - 4, fy - 4, fw + 8, fh + 8);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(fx - 4, fy - 4, fw + 8, fh + 8);

  // Archival photographic paper backing (warm off-white quiet zone)
  ctx.fillStyle = "#faf9f6";
  roundRect(ctx, fx, fy, fw, fh, 2);
  ctx.fill();

  // Subtle corner registration marks on frame
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1.5;
  const cl = 12;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(fx + 10, fy + 10 + cl);
  ctx.lineTo(fx + 10, fy + 10);
  ctx.lineTo(fx + 10 + cl, fy + 10);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(fx + fw - 10 - cl, fy + 10);
  ctx.lineTo(fx + fw - 10, fy + 10);
  ctx.lineTo(fx + fw - 10, fy + 10 + cl);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(fx + 10, fy + fh - 10 - cl);
  ctx.lineTo(fx + 10, fy + fh - 10);
  ctx.lineTo(fx + 10 + cl, fy + fh - 10);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(fx + fw - 10 - cl, fy + fh - 10);
  ctx.lineTo(fx + fw - 10, fy + fh - 10);
  ctx.lineTo(fx + fw - 10, fy + fh - 10 - cl);
  ctx.stroke();

  // Draw high-res QR code centered with generous quiet zone
  const qSize = 280;
  const qx = fx + (fw - qSize) / 2;
  const qy = fy + (fh - qSize) / 2;
  ctx.drawImage(img, qx, qy, qSize, qSize);

  // Frame corner stamp index inside photo aperture
  ctx.fillStyle = "#000000";
  ctx.font = `bold 10px ${MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("01A", fx + fw - 12, fy + fh - 10);

  // Bottom film edge markings
  ctx.textAlign = "left";
  ctx.fillStyle = STAMP;
  ctx.font = `bold 11px ${MONO}`;
  ctx.fillText("► 01A  •  SCAN TO JOIN ALBUM", 16, filmH - 10);

  if (eventDate) {
    ctx.textAlign = "right";
    ctx.fillStyle = STAMP_MUTED;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(eventDate, filmW - 16, filmH - 10);
  }

  ctx.restore();

  triggerDownload(await canvasToBlob(canvas), filename);
}
