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

function drawSprocketRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
) {
  const holeW = 16;
  const holeH = 22;
  const step = 30;
  ctx.fillStyle = "#050505";
  for (let x = 24; x < width - holeW; x += step) {
    roundRect(ctx, x, y, holeW, holeH, 4);
    ctx.fill();
  }
}

// QR composed onto a dark "film negative" card with the couple name, date,
// and a scannable white-backed QR in the center.
export async function exportFilmQr(
  svg: SVGSVGElement,
  filename: string,
  coupleName: string,
  eventDate: string,
) {
  const img = await svgToImage(svg);
  const W = 600;
  const H = 820;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  // Film base
  ctx.fillStyle = "#121110";
  ctx.fillRect(0, 0, W, H);

  // Sprocket rows
  drawSprocketRow(ctx, W, 22);
  drawSprocketRow(ctx, W, H - 44);

  // Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff9f0a";
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText(coupleName.toUpperCase(), W / 2, 120);
  ctx.fillStyle = "#cfcfcf";
  ctx.font = "20px Inter, system-ui, sans-serif";
  ctx.fillText(eventDate, W / 2, 152);

  // QR on a white backing (quiet zone) so it stays scannable
  const qSize = 300;
  const qx = (W - qSize) / 2;
  const qy = 210;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qx - 18, qy - 18, qSize + 36, qSize + 36);
  ctx.drawImage(img, qx, qy, qSize, qSize);

  // Footer
  ctx.fillStyle = "#ff9f0a";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("SCAN TO JOIN THE ALBUM", W / 2, qy + qSize + 52);

  triggerDownload(await canvasToBlob(canvas), filename);
}
