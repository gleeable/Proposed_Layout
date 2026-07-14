import { jsPDF } from 'jspdf';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// jsPDF's built-in fonts (Helvetica etc.) only cover Latin-1/WinAnsi, so any
// Korean text drawn with pdf.text() comes out as mojibake — embedding a
// Hangul-capable TTF just for this would add real bundle size. Instead, the
// whole floor plan (including Korean labels) is drawn on an HTML canvas —
// browser canvas text rendering uses the system font stack and handles
// Korean natively — then embedded as a single PNG, the same way the 3D
// screenshot page already is.
const PLAN_CANVAS_MAX_W = 1600;
const PLAN_CANVAS_MAX_H = 1200;
const PLAN_MARGIN_PX = 90;
const TITLE_HEIGHT_PX = 50;
const DIM_OFFSET_PX = 24;
const DIM_LINE_COLOR = '#334155'; // slate-600
const OBJECT_STROKE_COLOR = '#64748b'; // slate-500
const TEXT_COLOR = '#0f172a'; // slate-900
const OBJECT_TEXT_COLOR = '#1e293b'; // slate-800

function drawDimensionLine(ctx, x1, y1, x2, y2, label, isVertical) {
  ctx.strokeStyle = DIM_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const tick = 6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = (-dy / len) * tick;
  const perpY = (dx / len) * tick;
  ctx.beginPath();
  ctx.moveTo(x1 - perpX, y1 - perpY);
  ctx.lineTo(x1 + perpX, y1 + perpY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2 - perpX, y2 - perpY);
  ctx.lineTo(x2 + perpX, y2 + perpY);
  ctx.stroke();

  ctx.fillStyle = DIM_LINE_COLOR;
  ctx.font = '15px sans-serif';
  if (!isVertical) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 8);
  } else {
    ctx.save();
    ctx.translate(x1 - 10, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

// The 4 corners of a possibly-rotated object footprint, in the same meter
// coordinate space as object.x/y (center point) — matches the rotation
// convention Konva already uses for the 2D canvas (PlacedObjectShape.jsx).
function rotatedCorners(cx, cy, w, h, rotationDeg) {
  const rad = ((rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([dx, dy]) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
}

// Renders a top-down floor plan — building outline, overall width/depth
// dimension lines, and every placed object with a size label — onto a
// canvas, and returns it as a PNG data URL.
function renderFloorPlanImage({ footprint, floorObjects, floorLabel }) {
  const availW = PLAN_CANVAS_MAX_W - PLAN_MARGIN_PX * 2;
  const availH = PLAN_CANVAS_MAX_H - PLAN_MARGIN_PX * 2 - TITLE_HEIGHT_PX;
  const scale = Math.max(1, Math.min(availW / footprint.widthM, availH / footprint.depthM));
  const planW = footprint.widthM * scale;
  const planH = footprint.depthM * scale;

  const canvas = document.createElement('canvas');
  canvas.width = planW + PLAN_MARGIN_PX * 2;
  canvas.height = planH + PLAN_MARGIN_PX * 2 + TITLE_HEIGHT_PX;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${floorLabel} 평면도 (치수)`, PLAN_MARGIN_PX, 34);

  const planLeft = PLAN_MARGIN_PX;
  const planTop = PLAN_MARGIN_PX + TITLE_HEIGHT_PX;
  const toPx = (mx, my) => [planLeft + mx * scale, planTop + my * scale];

  ctx.strokeStyle = TEXT_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(planLeft, planTop, planW, planH);

  const [tlx, tly] = toPx(0, 0);
  const [trx] = toPx(footprint.widthM, 0);
  const [, bly] = toPx(0, footprint.depthM);
  drawDimensionLine(ctx, tlx, tly - DIM_OFFSET_PX, trx, tly - DIM_OFFSET_PX, `${footprint.widthM.toFixed(1)}m`, false);
  drawDimensionLine(ctx, tlx - DIM_OFFSET_PX, tly, tlx - DIM_OFFSET_PX, bly, `${footprint.depthM.toFixed(1)}m`, true);

  floorObjects.forEach((object) => {
    const corners = rotatedCorners(object.x, object.y, object.width, object.height, object.rotation).map(
      ([mx, my]) => toPx(mx, my)
    );
    ctx.strokeStyle = OBJECT_STROKE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < corners.length; i += 1) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath();
    ctx.stroke();

    const [cx, cy] = toPx(object.x, object.y);
    const widthMm = Math.round(object.width * 1000);
    const depthMm = Math.round(object.height * 1000);
    ctx.fillStyle = OBJECT_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (object.label) {
      ctx.font = '12px sans-serif';
      ctx.fillText(object.label, cx, cy - 3);
    }
    ctx.font = '10px sans-serif';
    ctx.fillText(`${widthMm}×${depthMm}`, cx, cy + 11);
  });

  return canvas.toDataURL('image/png');
}

async function addImagePage(pdf, imageDataUrl, { newPage } = {}) {
  const img = await loadImage(imageDataUrl);
  if (newPage) {
    pdf.addPage('a4', img.width >= img.height ? 'landscape' : 'portrait');
  }
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = Math.min(pageWidth / img.width, pageHeight / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;
  pdf.addImage(imageDataUrl, 'PNG', x, y, width, height);
}

// Builds the full export: the 3D view screenshot on page 1, followed by a
// dimensioned 2D floor plan of the same floor on page 2.
export async function saveDesignAsPdf({ imageDataUrl, footprint, floorObjects, floorLabel, fileName }) {
  const firstImg = await loadImage(imageDataUrl);
  const pdf = new jsPDF({
    orientation: firstImg.width >= firstImg.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });
  await addImagePage(pdf, imageDataUrl);

  const planDataUrl = renderFloorPlanImage({ footprint, floorObjects, floorLabel });
  await addImagePage(pdf, planDataUrl, { newPage: true });

  pdf.save(fileName);
}
