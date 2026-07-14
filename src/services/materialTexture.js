// Draws a small tileable swatch for each built-in material's `pattern` onto
// a <canvas>, used both as the palette thumbnail (via toDataURL) and as the
// repeating texture applied to walls/floor in the 3D view (via
// THREE.CanvasTexture). Kept deliberately simple — flat shapes, no photos —
// since these are stand-ins until/unless a user generates a real photo swatch.
const SIZE = 128;

function fillBackground(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawSolid(ctx, [color]) {
  fillBackground(ctx, color);
}

// Horizontal wood-grain streaks of varying opacity/thickness. The x-wave
// frequency is chosen so it completes a whole number of cycles across SIZE
// (sin(0) === sin(2*PI)) — otherwise the streak's left/right edges land at
// different phases and THREE's RepeatWrapping shows a visible seam every
// tile instead of one continuous floor.
function drawGrain(ctx, [base, dark]) {
  fillBackground(ctx, base);
  const lineCount = 22;
  const xFrequency = (Math.PI * 2) / SIZE;
  for (let i = 0; i < lineCount; i += 1) {
    const y = (i / lineCount) * SIZE + Math.sin(i * 1.7) * 2;
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.15 + (Math.abs(Math.sin(i * 2.3)) * 0.35);
    ctx.lineWidth = 1 + Math.abs(Math.cos(i)) * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= SIZE; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * xFrequency + i * 30) * 3);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Simple crosshatch weave for fabric/carpet. Step must evenly divide SIZE so
// the diagonal grid realigns exactly at each tile edge instead of showing a
// visible break.
function drawWeave(ctx, [base, accent]) {
  fillBackground(ctx, base);
  const step = 8;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let i = -SIZE; i < SIZE * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, SIZE);
    ctx.lineTo(i + SIZE, 0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Wavy marble veins over a base color. Each vein's horizontal wander is one
// full sine cycle over the tile height, so its position at y=0 exactly
// matches y=SIZE (seamless top/bottom); drawing each vein again shifted a
// full tile-width left/right covers the seamless left/right case too.
function drawMarble(ctx, [base, vein]) {
  fillBackground(ctx, base);
  ctx.strokeStyle = vein;
  ctx.globalAlpha = 0.5;
  const veinCount = 6;
  const step = SIZE / 16;
  for (let i = 0; i < veinCount; i += 1) {
    const x0 = Math.random() * SIZE;
    const amplitude = 10 + Math.random() * 15;
    const phase = Math.random() * Math.PI * 2;
    ctx.lineWidth = 1 + Math.random() * 2;
    for (const dx of [-SIZE, 0, SIZE]) {
      ctx.beginPath();
      for (let y = 0; y <= SIZE; y += step) {
        const x = x0 + dx + Math.sin((y / SIZE) * Math.PI * 2 + phase) * amplitude;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// Grout-line grid — reads as tile at any scale.
function drawGrid(ctx, [base], cols = 4) {
  fillBackground(ctx, base);
  const cell = SIZE / cols;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= cols; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(SIZE, i * cell);
    ctx.stroke();
  }
}

// Offset brick/subway courses. Row count must evenly divide SIZE (unlike
// the original 6) so course lines land on whole pixels and repeat without a
// visible gap/overlap at the tile seam.
function drawBrick(ctx, [base]) {
  fillBackground(ctx, base);
  const rows = 8;
  const rowH = SIZE / rows;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let r = 0; r < rows; r += 1) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
    const offset = r % 2 === 0 ? 0 : SIZE / 4;
    for (let x = offset; x < SIZE; x += SIZE / 2) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }
}

// Random speckles for concrete/terrazzo/travertine. A dot near an edge is
// also drawn shifted a full tile-width/height, so it's still visible on the
// opposite edge — otherwise dots get cut off at the border and the tile
// boundary reads as a visible seam instead of scattered speckle.
function drawSpeckle(ctx, [base, accent]) {
  fillBackground(ctx, base);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = 1 + Math.random() * 4;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.25 + Math.random() * 0.5;
    for (const dx of [-SIZE, 0, SIZE]) {
      for (const dy of [-SIZE, 0, SIZE]) {
        const wx = x + dx;
        const wy = y + dy;
        if (wx > -r && wx < SIZE + r && wy > -r && wy < SIZE + r) {
          ctx.beginPath();
          ctx.arc(wx, wy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

const PATTERN_DRAWERS = {
  solid: drawSolid,
  grain: drawGrain,
  weave: drawWeave,
  marble: drawMarble,
  grid: drawGrid,
  brick: drawBrick,
  speckle: drawSpeckle,
};

export function renderMaterialCanvas(material) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const draw = PATTERN_DRAWERS[material.pattern] || drawSolid;
  // material.colors is only guaranteed on built-in catalog entries — guard
  // against being handed something else (e.g. a custom material whose
  // imageDataUrl failed to restore from IndexedDB) so a bad swatch can't
  // throw and take the whole render tree down with it.
  draw(ctx, material.colors || ['#D1D5DB']);
  return canvas;
}

export function renderMaterialThumbnail(material) {
  return renderMaterialCanvas(material).toDataURL('image/png');
}
