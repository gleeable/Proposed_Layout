const MIN_SIZE = 0.2;

export function normalizeTransform({ x, y, width, height, scaleX, scaleY, rotation }) {
  const nextWidth = Math.max(MIN_SIZE, Math.abs(width * scaleX));
  const nextHeight = Math.max(MIN_SIZE, Math.abs(height * scaleY));
  return {
    x,
    y,
    width: nextWidth,
    height: nextHeight,
    rotation,
  };
}
