import { useEffect, useRef, useState } from 'react';
import { Rect } from 'react-konva';
import { stagePxToMeters } from './canvasGeometry';

const MIN_COPY_DRAG_PX = 4;

export function GroupDragProxy({
  selectedIds,
  getNode,
  scale,
  onDeltaMeters,
  onDragBegin,
  onDuplicateBy,
  setSelectedIds,
  ctrlRef,
  onContextMenu,
}) {
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isCopyRef = useRef(false);
  const [box, setBox] = useState(null);

  useEffect(() => {
    if (selectedIds.length < 2) {
      setBox(null);
      return;
    }
    const rects = selectedIds
      .map((id) => getNode(id))
      .filter(Boolean)
      .map((node) => node.getClientRect());
    if (rects.length === 0) {
      setBox(null);
      return;
    }
    const x1 = Math.min(...rects.map((r) => r.x));
    const y1 = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.width));
    const y2 = Math.max(...rects.map((r) => r.y + r.height));
    setBox({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  }, [selectedIds, getNode]);

  if (!box) return null;

  function handleDragStart(e) {
    const ctrlHeld = Boolean(ctrlRef?.current || e.evt.ctrlKey || e.evt.metaKey);
    isCopyRef.current = ctrlHeld;
    // Ctrl+drag duplicates on drop instead of moving the originals live, so
    // don't open an undo step for a move that's about to be reverted.
    if (!ctrlHeld) onDragBegin?.();
    lastPos.current = { x: e.target.x(), y: e.target.y() };
    dragStartPos.current = { x: e.target.x(), y: e.target.y() };
  }

  function handleDragMove(e) {
    const node = e.target;
    if (isCopyRef.current) {
      // Let the dashed proxy box move freely as drag feedback; the real
      // objects stay put until drop, when a duplicate is created instead.
      return;
    }
    const dxPx = node.x() - lastPos.current.x;
    const dyPx = node.y() - lastPos.current.y;
    if (dxPx !== 0 || dyPx !== 0) {
      onDeltaMeters(stagePxToMeters(dxPx, scale), stagePxToMeters(dyPx, scale));
    }
    lastPos.current = { x: node.x(), y: node.y() };
  }

  function handleDragEnd(e) {
    if (!isCopyRef.current) return;
    const node = e.target;
    const dxPx = node.x() - dragStartPos.current.x;
    const dyPx = node.y() - dragStartPos.current.y;
    node.position({ x: box.x, y: box.y });
    node.getLayer()?.batchDraw();

    if (Math.hypot(dxPx, dyPx) < MIN_COPY_DRAG_PX) return;

    const dxM = stagePxToMeters(dxPx, scale);
    const dyM = stagePxToMeters(dyPx, scale);
    const newIds = onDuplicateBy?.(selectedIds, dxM, dyM);
    if (newIds?.length) setSelectedIds?.(newIds);
  }

  function handleContextMenu(e) {
    e.evt.preventDefault();
    e.cancelBubble = true;
    onContextMenu?.();
  }

  return (
    <Rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      stroke="#4338ca"
      dash={[4, 4]}
      fill="rgba(67,56,202,0.05)"
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
    />
  );
}
