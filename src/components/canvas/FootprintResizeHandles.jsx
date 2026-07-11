import { Circle } from 'react-konva';
import { metersToStagePx, stagePxToMeters } from './canvasGeometry';

const HANDLE_RADIUS = 6;
const HANDLE_FILL = '#4338ca';

// Three drag handles on the footprint's right edge, bottom edge, and
// bottom-right corner. Konva owns each handle's x/y while it's being
// dragged; dragBoundFunc locks the axis a given handle shouldn't move
// along, and onDragMove reads the live position back into meters and
// commits it immediately so the outline/dimensions resize as you drag.
export function FootprintResizeHandles({ footprint, scale, offsetX, offsetY, onResize }) {
  const widthPx = metersToStagePx(footprint.widthM, scale);
  const depthPx = metersToStagePx(footprint.depthM, scale);
  const rightX = offsetX + widthPx;
  const bottomY = offsetY + depthPx;
  const midY = offsetY + depthPx / 2;
  const midX = offsetX + widthPx / 2;

  function commitFromNode(node, { width, depth }) {
    if (width) onResize({ widthM: stagePxToMeters(node.x() - offsetX, scale) });
    if (depth) onResize({ depthM: stagePxToMeters(node.y() - offsetY, scale) });
  }

  return (
    <>
      {/* right edge — width only */}
      <Circle
        x={rightX}
        y={midY}
        radius={HANDLE_RADIUS}
        fill={HANDLE_FILL}
        draggable
        dragBoundFunc={(pos) => ({ x: pos.x, y: midY })}
        onDragMove={(e) => commitFromNode(e.target, { width: true })}
      />
      {/* bottom edge — depth only */}
      <Circle
        x={midX}
        y={bottomY}
        radius={HANDLE_RADIUS}
        fill={HANDLE_FILL}
        draggable
        dragBoundFunc={(pos) => ({ x: midX, y: pos.y })}
        onDragMove={(e) => commitFromNode(e.target, { depth: true })}
      />
      {/* corner — both */}
      <Circle
        x={rightX}
        y={bottomY}
        radius={HANDLE_RADIUS}
        fill={HANDLE_FILL}
        draggable
        onDragMove={(e) => commitFromNode(e.target, { width: true, depth: true })}
      />
    </>
  );
}
