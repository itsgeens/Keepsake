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

const FILM = "#131210";
const FILM_REBATE = "#080706";
const STAMP_AMBER = "#f59e0b";
const STAMP_GREEN = "#a3e635";
const STAMP_MUTED = "#b45309";
const SPROCKET = "#050404";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace';
const OUTER = 22;

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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Draw authentic DX barcode data tracks (like on real Kodak/Fuji film edges)
function drawDxBarcode(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  totalWidth: number,
) {
  const pattern = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2];
  let curX = startX;
  let idx = 0;
  while (curX < startX + totalWidth) {
    const barW = pattern[idx % pattern.length];
    const isGreen = idx % 5 === 0;
    ctx.fillStyle = isGreen ? STAMP_GREEN : STAMP_AMBER;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(curX, y, barW, 6);
    curX += barW + 2;
    idx++;
  }
  ctx.globalAlpha = 1;
}

// QR composed onto an authentic 35mm analog film negative slide with DX barcodes,
// edge rebate codes, continuous sprockets, and a backlit slide aperture.
export async function exportFilmQr(
  svg: SVGSVGElement,
  filename: string,
  coupleName: string,
  eventDate: string,
) {
  const img = await svgToImage(svg);

  // 35mm Film Slide Frame Proportions
  const filmW = 560;
  const filmH = 470;
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

  // Outer light table / white margin for crisp contrast
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalW, totalH);

  // Dark acetate film body
  ctx.fillStyle = FILM;
  roundRect(ctx, OUTER, OUTER, filmW, filmH, 6);
  ctx.fill();

  // Subtle acetate bevel stroke
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(OUTER, OUTER);

  // Top & bottom continuous 35mm sprocket rows
  drawSprocketRow(ctx, filmW, 8);
  drawSprocketRow(ctx, filmW, filmH - 25);

  // Top film stock markings & DX barcode
  const stampTitle = (coupleName || "KEEPSAKE").toUpperCase();
  ctx.font = `bold 10px ${MONO}`;
  ctx.fillStyle = STAMP_AMBER;
  ctx.textAlign = "left";
  ctx.fillText(`KODAK 400 SAFETY FILM  •  ${stampTitle}`, 16, 33);

  // DX Barcode strip on top right
  drawDxBarcode(ctx, filmW - 140, 27, 70);

  ctx.textAlign = "right";
  ctx.fillStyle = STAMP_GREEN;
  ctx.font = `bold 9px ${MONO}`;
  ctx.fillText("DX-400", filmW - 16, 33);

  // Center 35mm Film Aperture Window (where the QR lives as an exposed slide)
  const fw = 340;
  const fh = 340;
  const fx = (filmW - fw) / 2;
  const fy = 45;

  // Film aperture rebate / dark mask bezel
  ctx.fillStyle = FILM_REBATE;
  roundRect(ctx, fx - 5, fy - 5, fw + 10, fh + 10, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Backlit Film Slide Transparency (warm emulsion tone with soft vignette)
  const grad = ctx.createRadialGradient(
    fx + fw / 2,
    fy + fh / 2,
    fw * 0.2,
    fx + fw / 2,
    fy + fh / 2,
    fw * 0.7,
  );
  grad.addColorStop(0, "#faf7f0");
  grad.addColorStop(0.85, "#f4eee0");
  grad.addColorStop(1, "#eae1cf");

  ctx.fillStyle = grad;
  roundRect(ctx, fx, fy, fw, fh, 3);
  ctx.fill();

  // Subtle film aperture inner border
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx, fy, fw, fh);

  // Authentic corner registration tick marks
  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 1.5;
  const cl = 10;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(fx + 8, fy + 8 + cl);
  ctx.lineTo(fx + 8, fy + 8);
  ctx.lineTo(fx + 8 + cl, fy + 8);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(fx + fw - 8 - cl, fy + 8);
  ctx.lineTo(fx + fw - 8, fy + 8);
  ctx.lineTo(fx + fw - 8, fy + 8 + cl);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(fx + 8, fy + fh - 8 - cl);
  ctx.lineTo(fx + 8, fy + fh - 8);
  ctx.lineTo(fx + 8 + cl, fy + fh - 8);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(fx + fw - 8 - cl, fy + fh - 8);
  ctx.lineTo(fx + fw - 8, fy + fh - 8);
  ctx.lineTo(fx + fw - 8, fy + fh - 8 - cl);
  ctx.stroke();

  // Slide top & bottom micro labels inside the film window
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.font = `bold 8px ${MONO}`;
  ctx.textAlign = "center";
  ctx.fillText("35MM SLIDE TRANSPARENCY  •  SAFETY FILM", fx + fw / 2, fy + 14);

  // Draw high-res QR code centered with clear quiet zone
  const qSize = 270;
  const qx = fx + (fw - qSize) / 2;
  const qy = fy + (fh - qSize) / 2 + 2;
  ctx.drawImage(img, qx, qy, qSize, qSize);

  // Frame stamp index inside aperture
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.font = `bold 9px ${MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("#19A", fx + fw - 10, fy + fh - 8);

  // Bottom edge markings & DX barcode on bottom rail
  ctx.textAlign = "left";
  ctx.fillStyle = STAMP_AMBER;
  ctx.font = `bold 10px ${MONO}`;
  ctx.fillText("► 19A  •  SCAN TO JOIN ROLL", 16, filmH - 10);

  // DX Barcode strip on bottom right
  drawDxBarcode(ctx, filmW - 200, filmH - 16, 60);

  if (eventDate) {
    ctx.textAlign = "right";
    ctx.fillStyle = STAMP_MUTED;
    ctx.font = `9px ${MONO}`;
    ctx.fillText(eventDate, filmW - 16, filmH - 10);
  }

  ctx.restore();

  triggerDownload(await canvasToBlob(canvas), filename);
}
