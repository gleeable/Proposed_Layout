import { useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const WHEEL_PAN_SENSITIVITY = 0.8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Normalizes deltaY/deltaX across mice, trackpads and deltaMode (pixel/line/page)
// into a single "how many screen px did the user just scroll" number.
function normalizeWheelDelta(e) {
  const modeMultiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  return raw * modeMultiplier;
}

// Owns 2D viewport zoom/pan: Ctrl+wheel zoom, Alt+wheel horizontal pan, and
// Shift+wheel vertical pan. Drag-on-empty-space now drives marquee selection
// instead of panning (see useMarqueeSelection) — this hook is wheel-only.
export function useCanvasViewport({ containerRef, disabled }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    function handleWheel(e) {
      if (disabledRef.current) return;
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => clamp(z * (1 - e.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM));
        return;
      }
      if (e.altKey) {
        e.preventDefault();
        const delta = normalizeWheelDelta(e) * WHEEL_PAN_SENSITIVITY;
        setPan((p) => ({ ...p, x: p.x + delta }));
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        // Browsers natively swap deltaY into deltaX while Shift is held, so
        // the vertical scroll motion shows up as deltaX by the time we see
        // it here — normalizeWheelDelta already picks whichever axis moved.
        const delta = normalizeWheelDelta(e) * WHEEL_PAN_SENSITIVITY;
        setPan((p) => ({ ...p, y: p.y + delta }));
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  return { zoom, pan };
}
