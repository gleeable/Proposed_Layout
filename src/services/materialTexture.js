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

// Horizontal wood-grain streaks of varying opacity/thickness.
function drawGrain(ctx, [base, dark]) {
  fillBackground(ctx, base);
  const lineCount = 22;
  for (let i = 0; i < lineCount; i += 1) {
    const y = (i / lineCount) * SIZE + Math.sin(i * 1.7) * 2;
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.15 + (Math.abs(Math.sin(i * 2.3)) * 0.35);
    ctx.lineWidth = 1 + Math.abs(Math.cos(i)) * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= SIZE; x += 16) {
      ctx.lineTo(x, y + Math.sin((x + i * 30) * 0.05) * 3);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Simple crosshatch weave for fabric/carpet.
function drawWeave(ctx, [base, accent]) {
  fillBackground(ctx, base);
  const step = 6;
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

// Diagonal marble veins over a base color.
function drawMarble(ctx, [base, vein]) {
  fillBackground(ctx, base);
  ctx.strokeStyle = vein;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 6; i += 1) {
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * SIZE;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < SIZE) {
      x += (Math.random() - 0.5) * 30;
      y += SIZE / 8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
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

// Offset brick/subway courses.
function drawBrick(ctx, [base]) {
  fillBackground(ctx, base);
  const rows = 6;
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

// Random speckles for concrete/terrazzo/travertine.
function drawSpeckle(ctx, [base, accent]) {
  fillBackground(ctx, base);
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.25 + Math.random() * 0.5;
    const r = 1 + Math.random() * 4;
    ctx.beginPath();
    ctx.arc(Math.random() * SIZE, Math.random() * SIZE, r, 0, Math.PI * 2);
    ctx.fill();
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
  draw(ctx, material.colors);
  return canvas;
}

export function renderMaterialThumbnail(material) {
  return renderMaterialCanvas(material).toDataURL('image/png');
}
