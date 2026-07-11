import { useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const PAN_CLICK_THRESHOLD_PX = 4;
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

// Owns 2D viewport interaction: Ctrl+wheel zoom, Alt+wheel horizontal pan,
// and drag-on-empty-space pan (via Konva pointer events + Pointer Capture).
// Product placement/selection/drag are handled elsewhere; this hook only
// ever acts when the pointer/wheel event targets empty canvas.
export function useCanvasViewport({ containerRef, disabled, onEmptyClick }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panState = useRef(null);
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
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  // If the mouse button is released outside the browser (alt-tab, a native
  // dialog, losing window focus mid-drag) the pointerup/pointercancel that
  // would normally end a pan never reaches us — panState.current is left
  // "moved" forever, and every subsequent mouse move over the canvas (even
  // with no button held) keeps calling setPan, i.e. the layout permanently
  // follows the cursor. Force-clear it whenever the window loses focus.
  useEffect(() => {
    function forceEndPan() {
      if (!panState.current) return;
      panState.current = null;
      setIsPanning(false);
    }
    window.addEventListener('blur', forceEndPan);
    document.addEventListener('visibilitychange', forceEndPan);
    return () => {
      window.removeEventListener('blur', forceEndPan);
      document.removeEventListener('visibilitychange', forceEndPan);
    };
  }, []);

  function handleStagePointerDown(e) {
    if (disabledRef.current) return;
    const stage = e.target.getStage();
    if (e.target !== stage) return; // a shape was hit — let its own handlers deal with it

    const evt = e.evt;
    panState.current = {
      pointerId: evt.pointerId,
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      startPan: pan,
      moved: false,
    };
    if (typeof evt.pointerId === 'number') {
      try {
        stage.container().setPointerCapture(evt.pointerId);
      } catch {
        // pointer capture isn't available in every environment (e.g. jsdom) — pan still works
      }
    }
  }

  function handleStagePointerMove(e) {
    const ps = panState.current;
    if (!ps) return;
    const evt = e.evt;

    // Defense in depth alongside the blur/visibilitychange listener above:
    // `buttons` is a live bitmask of currently-held mouse buttons on every
    // pointermove event, independent of whether pointerup ever fired. If the
    // primary button (bit 1) isn't set anymore, the drag has definitely
    // ended even though we never got the event saying so — stop panning
    // instead of letting the layout keep following the cursor.
    if (typeof evt.buttons === 'number' && (evt.buttons & 1) === 0) {
      endPan(e, { treatAsClick: false });
      return;
    }

    const dx = evt.clientX - ps.startClientX;
    const dy = evt.clientY - ps.startClientY;

    if (!ps.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD_PX) {
      ps.moved = true;
      setIsPanning(true);
    }
    if (ps.moved) {
      setPan({ x: ps.startPan.x + dx, y: ps.startPan.y + dy });
    }
  }

  function endPan(e, { treatAsClick }) {
    const ps = panState.current;
    if (!ps) return;
    if (typeof ps.pointerId === 'number') {
      try {
        e.target.getStage()?.container().releasePointerCapture(ps.pointerId);
      } catch {
        // no-op — capture may already have been released
      }
    }
    panState.current = null;
    setIsPanning(false);
    if (treatAsClick && !ps.moved) onEmptyClick?.();
  }

  function handleStagePointerUp(e) {
    endPan(e, { treatAsClick: true });
  }

  function handleStagePointerCancel(e) {
    endPan(e, { treatAsClick: false });
  }

  return {
    zoom,
    pan,
    isPanning,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
  };
}
