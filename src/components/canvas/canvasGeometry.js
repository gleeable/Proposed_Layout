const PADDING_PX = 40;

export function computeFitScale(footprint, stageWidth, stageHeight) {
  if (!footprint || stageWidth <= 0 || stageHeight <= 0) return 20;
  const availableW = Math.max(1, stageWidth - PADDING_PX * 2);
  const availableH = Math.max(1, stageHeight - PADDING_PX * 2);
  const scaleForWidth = availableW / footprint.widthM;
  const scaleForHeight = availableH / footprint.depthM;
  return Math.max(1, Math.min(scaleForWidth, scaleForHeight));
}

export function computeFootprintOffset(footprint, scale, stageWidth, stageHeight) {
  const footprintWidthPx = footprint.widthM * scale;
  const footprintDepthPx = footprint.depthM * scale;
  return {
    offsetX: (stageWidth - footprintWidthPx) / 2,
    offsetY: (stageHeight - footprintDepthPx) / 2,
  };
}

export function metersToStagePx(valueM, scale) {
  return valueM * scale;
}

export function stagePxToMeters(valuePx, scale) {
  return valuePx / scale;
}

// Single source of truth for world(meters) <-> screen(stage px) conversion.
// offsetX/offsetY already carry both the footprint-centering offset and any
// user pan, so every caller (placement, drag, copy, selection) stays in sync
// as long as they're fed the same scale/offsetX/offsetY the scene was drawn with.
export function worldToScreen(worldXM, worldYM, scale, offsetX, offsetY) {
  return {
    x: offsetX + metersToStagePx(worldXM, scale),
    y: offsetY + metersToStagePx(worldYM, scale),
  };
}

export function screenToWorld(screenX, screenY, scale, offsetX, offsetY) {
  return {
    x: stagePxToMeters(screenX - offsetX, scale),
    y: stagePxToMeters(screenY - offsetY, scale),
  };
}

export function metersToMm(valueM) {
  return valueM * 1000;
}

export function mmToMeters(valueMm) {
  return valueMm / 1000;
}
