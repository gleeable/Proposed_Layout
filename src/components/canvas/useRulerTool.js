import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { createId } from '../../domain/ids';
import { screenToWorld } from './canvasGeometry';

// While Ctrl/Cmd is held, the in-progress segment snaps to whichever axis
// (horizontal or vertical) it's closer to, measured from the start point.
function snapToAxis(start, point) {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  return Math.abs(dx) >= Math.abs(dy) ? { x: point.x, y: start.y } : { x: start.x, y: point.y };
}

// Click-to-measure flow, independent of object selection: while ruler mode
// is active, clicks alternate between placing a segment's start point and
// placing its end point. Each start/end pair is finalized as a segment (its
// length label stays on screen) and the very next click begins a fresh,
// unconnected segment. Right-click (PlacedObjectShape/DesignCanvas route
// their contextmenu here) and Escape both clear every measured segment;
// turning the tool off also clears them.
export function useRulerTool({ scale, offsetX, offsetY, ctrlRef }) {
  const isRulerActive = useAppStore((s) => s.isRulerActive);
  const toggleRulerMode = useAppStore((s) => s.toggleRulerMode);

  const [segments, setSegments] = useState([]);
  const [pendingStart, setPendingStart] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);

  useEffect(() => {
    if (!isRulerActive) {
      setSegments([]);
      setPendingStart(null);
      setPreviewPoint(null);
    }
  }, [isRulerActive]);

  useEffect(() => {
    if (!isRulerActive) return undefined;
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      // First Escape just cancels the in-progress segment; a second press
      // (or an already-idle tool) exits ruler mode entirely.
      if (pendingStart) {
        setPendingStart(null);
        setPreviewPoint(null);
      } else {
        toggleRulerMode();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRulerActive, pendingStart, toggleRulerMode]);

  function handleStagePointerMove(e) {
    if (!isRulerActive || !pendingStart) return;
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer.x, pointer.y, scale, offsetX, offsetY);
    setPreviewPoint(ctrlRef?.current ? snapToAxis(pendingStart, world) : world);
  }

  // Returns true when it consumed the click (caller should skip its own
  // click handling for this event while the ruler is active).
  function handleStageClick(e) {
    if (!isRulerActive) return false;
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return true;
    const world = screenToWorld(pointer.x, pointer.y, scale, offsetX, offsetY);

    if (!pendingStart) {
      setPendingStart(world);
      setPreviewPoint(world);
    } else {
      const end = ctrlRef?.current ? snapToAxis(pendingStart, world) : world;
      setSegments((prev) => [...prev, { id: createId(), start: pendingStart, end }]);
      setPendingStart(null);
      setPreviewPoint(null);
    }
    return true;
  }

  function clear() {
    setSegments([]);
    setPendingStart(null);
    setPreviewPoint(null);
  }

  // Returns true when it consumed the event (caller should preventDefault).
  function handleStageContextMenu() {
    if (!isRulerActive) return false;
    clear();
    return true;
  }

  return {
    isRulerActive,
    segments,
    pendingStart,
    previewPoint,
    handleStagePointerMove,
    handleStageClick,
    handleStageContextMenu,
  };
}
