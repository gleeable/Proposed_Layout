import { Rect } from 'react-konva';
import { metersToStagePx } from './canvasGeometry';

export function FootprintOutline({ footprint, scale, offsetX, offsetY }) {
  return (
    <Rect
      x={offsetX}
      y={offsetY}
      width={metersToStagePx(footprint.widthM, scale)}
      height={metersToStagePx(footprint.depthM, scale)}
      stroke="#4338ca"
      strokeWidth={2}
      dash={[6, 4]}
      fill="#ffffff"
      listening={false}
    />
  );
}
