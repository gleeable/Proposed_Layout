import { useRef } from 'react';
import { screenToWorld, worldToScreen } from './canvasGeometry';

const MIN_COPY_DRAG_PX = 4;

// Ctrl(+drag)/Cmd(+drag) duplicate: if Ctrl/Cmd is held when a placed
// object's drag starts, the *original* object is left untouched and a
// duplicate is created wherever the drag ends. The drag finalizes as a copy
// on whichever happens first: releasing Ctrl mid-drag, or releasing the
// mouse while Ctrl is still held. Losing focus (blur) aborts with no copy.
export function useProductCopyDrag({ getNode, scale, offsetX, offsetY, duplicateObjectAt, setSelectedIds, updateObjectPosition, ctrlRef }) {
  const dragRef = useRef(null);
  // Konva's node.stopDrag() fires 'dragend' *synchronously*, before it returns.
  // Since our own dragend handler can itself call stopDrag() (to finalize early
  // on keyup), that would normally re-enter this same finalize logic while the
  // drag element is still marked "stopped" in Konva's internal registry,
  // re-firing 'dragend' again and recursing without end (stack overflow).
  // This ref makes the finalize/abort paths re-entrancy-safe: while true, any
  // dragend that bounces back in here is a synthetic echo of our own
  // stopDrag() call and is ignored.
  const finalizingRef = useRef(false);

  function cleanupListeners() {
    const d = dragRef.current;
    if (!d) return;
    window.removeEventListener('keyup', d.keyupHandler);
    window.removeEventListener('blur', d.blurHandler);
  }

  function revertNodeToOrigin(d) {
    const node = getNode(d.id);
    if (!node) return;
    const { x: px, y: py } = worldToScreen(d.origin.x, d.origin.y, scale, offsetX, offsetY);
    node.position({ x: px, y: py });
    node.getLayer()?.batchDraw();
  }

  function finalizeCopy() {
    if (finalizingRef.current) return;
    const d = dragRef.current;
    if (!d) return;
    finalizingRef.current = true;
    try {
      const node = getNode(d.id);
      if (!node) return;

      const distPx = Math.hypot(node.x() - d.startNodePx.x, node.y() - d.startNodePx.y);
      // Only call stopDrag() if Konva still thinks a drag is in progress (the
      // keyup-during-drag path) — if we got here from a real mouseup, Konva
      // has already stopped the drag and calling it again is what causes the
      // synchronous dragend re-entrancy described above.
      if (node.isDragging()) node.stopDrag();

      if (distPx < MIN_COPY_DRAG_PX) {
        revertNodeToOrigin(d);
        return;
      }

      const world = screenToWorld(node.x(), node.y(), scale, offsetX, offsetY);
      revertNodeToOrigin(d);

      const newId = duplicateObjectAt(d.id, world.x, world.y);
      if (newId) setSelectedIds([newId]);
    } finally {
      cleanupListeners();
      dragRef.current = null;
      finalizingRef.current = false;
    }
  }

  function abortCopyDrag() {
    if (finalizingRef.current) return;
    const d = dragRef.current;
    if (!d) return;
    finalizingRef.current = true;
    try {
      const node = getNode(d.id);
      if (node?.isDragging()) node.stopDrag();
      revertNodeToOrigin(d);
    } finally {
      cleanupListeners();
      dragRef.current = null;
      finalizingRef.current = false;
    }
  }

  function handleObjectDragStart(id, object, evt) {
    const ctrlHeld = Boolean(ctrlRef?.current || evt.evt.ctrlKey || evt.evt.metaKey);
    if (!ctrlHeld) return;

    const node = getNode(id);
    if (!node) return;

    const keyupHandler = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') finalizeCopy();
    };
    const blurHandler = () => abortCopyDrag();

    dragRef.current = {
      id,
      origin: { x: object.x, y: object.y },
      startNodePx: { x: node.x(), y: node.y() },
      keyupHandler,
      blurHandler,
    };
    window.addEventListener('keyup', keyupHandler);
    window.addEventListener('blur', blurHandler);
  }

  function handleObjectDragEnd(id, object, xMeters, yMeters) {
    // A dragend bouncing back in while we're already finalizing is the
    // synthetic echo from our own stopDrag() call (see finalizeCopy) — the
    // in-flight finalize already owns wrapping this up, so ignore it here.
    if (finalizingRef.current) return;
    const d = dragRef.current;
    if (d && d.id === id) {
      finalizeCopy();
      return;
    }
    updateObjectPosition(id, xMeters, yMeters);
  }

  return { handleObjectDragStart, handleObjectDragEnd };
}
