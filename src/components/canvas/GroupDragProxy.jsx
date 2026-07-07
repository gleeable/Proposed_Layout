import { useEffect, useRef, useState } from 'react';
import { Rect } from 'react-konva';
import { stagePxToMeters } from './canvasGeometry';

export function GroupDragProxy({ selectedIds, getNode, scale, onDeltaMeters }) {
  const lastPos = useRef({ x: 0, y: 0 });
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
    lastPos.current = { x: e.target.x(), y: e.target.y() };
  }

  function handleDragMove(e) {
    const node = e.target;
    const dxPx = node.x() - lastPos.current.x;
    const dyPx = node.y() - lastPos.current.y;
    if (dxPx !== 0 || dyPx !== 0) {
      onDeltaMeters(stagePxToMeters(dxPx, scale), stagePxToMeters(dyPx, scale));
    }
    lastPos.current = { x: node.x(), y: node.y() };
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
    />
  );
}
