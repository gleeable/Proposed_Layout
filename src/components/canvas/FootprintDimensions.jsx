import { Group, Line, Text } from 'react-konva';
import { metersToStagePx } from './canvasGeometry';

const GAP_PX = 18;
const TICK_PX = 6;
const DEFAULT_FLOOR_HEIGHT_M = 3;

// Architectural-style dimension lines (extension ticks + a line + a
// centered label) along the top and left edges of the footprint, plus a
// height readout — there's no natural place to "draw" height on a top-down
// plan, so it's just a label.
export function FootprintDimensions({ footprint, heightM, floorCount, scale, offsetX, offsetY }) {
  const widthPx = metersToStagePx(footprint.widthM, scale);
  const depthPx = metersToStagePx(footprint.depthM, scale);
  const effectiveHeightM = heightM || (floorCount || 1) * DEFAULT_FLOOR_HEIGHT_M;

  const topY = offsetY - GAP_PX;
  const leftX = offsetX - GAP_PX;

  return (
    <Group listening={false}>
      {/* width (가로) — top edge */}
      <Line points={[offsetX, topY - TICK_PX, offsetX, topY + TICK_PX]} stroke="#6b7280" strokeWidth={1} />
      <Line points={[offsetX + widthPx, topY - TICK_PX, offsetX + widthPx, topY + TICK_PX]} stroke="#6b7280" strokeWidth={1} />
      <Line points={[offsetX, topY, offsetX + widthPx, topY]} stroke="#6b7280" strokeWidth={1} />
      <Text
        x={offsetX}
        y={topY - 20}
        width={widthPx}
        align="center"
        text={`가로 ${footprint.widthM.toFixed(1)}m`}
        fontSize={12}
        fill="#374151"
      />

      {/* depth (세로) — left edge */}
      <Line points={[leftX - TICK_PX, offsetY, leftX + TICK_PX, offsetY]} stroke="#6b7280" strokeWidth={1} />
      <Line points={[leftX - TICK_PX, offsetY + depthPx, leftX + TICK_PX, offsetY + depthPx]} stroke="#6b7280" strokeWidth={1} />
      <Line points={[leftX, offsetY, leftX, offsetY + depthPx]} stroke="#6b7280" strokeWidth={1} />
      <Text
        x={leftX - 8}
        y={offsetY + depthPx / 2}
        width={80}
        align="center"
        text={`세로 ${footprint.depthM.toFixed(1)}m`}
        fontSize={12}
        fill="#374151"
        rotation={-90}
        offsetX={40}
        offsetY={6}
      />

      {/* height (높이) — no 2D edge to attach to, so just a label */}
      <Text
        x={offsetX + widthPx + GAP_PX}
        y={offsetY}
        text={`높이 ${effectiveHeightM.toFixed(1)}m`}
        fontSize={12}
        fill="#374151"
      />
    </Group>
  );
}
