import { Group, Line, Circle, Label, Tag, Text } from 'react-konva';
import { worldToScreen } from './canvasGeometry';

function distanceM(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function formatLength(meters) {
  return meters < 1 ? `${Math.round(meters * 100)}cm` : `${meters.toFixed(2)}m`;
}

function RulerSegment({ start, end, scale, offsetX, offsetY, dashed }) {
  const p1 = worldToScreen(start.x, start.y, scale, offsetX, offsetY);
  const p2 = worldToScreen(end.x, end.y, scale, offsetX, offsetY);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return (
    <Group listening={false}>
      <Line points={[p1.x, p1.y, p2.x, p2.y]} stroke="#dc2626" strokeWidth={1.5} dash={dashed ? [6, 4] : undefined} />
      <Circle x={p1.x} y={p1.y} radius={3.5} fill="#dc2626" />
      <Circle x={p2.x} y={p2.y} radius={3.5} fill="#dc2626" />
      <Label x={midX} y={midY} offsetX={-6} offsetY={16}>
        <Tag fill="#dc2626" cornerRadius={3} />
        <Text text={formatLength(distanceM(start, end))} fontSize={12} fill="#ffffff" padding={4} />
      </Label>
    </Group>
  );
}

// Renders every finalized ruler segment plus the in-progress preview (a
// dashed line from the pending start point to the live pointer position).
export function RulerOverlay({ segments, pendingStart, previewPoint, scale, offsetX, offsetY }) {
  return (
    <Group listening={false}>
      {segments.map((seg) => (
        <RulerSegment key={seg.id} start={seg.start} end={seg.end} scale={scale} offsetX={offsetX} offsetY={offsetY} />
      ))}
      {pendingStart && previewPoint && (
        <RulerSegment start={pendingStart} end={previewPoint} scale={scale} offsetX={offsetX} offsetY={offsetY} dashed />
      )}
    </Group>
  );
}
