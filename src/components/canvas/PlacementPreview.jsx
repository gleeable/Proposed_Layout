import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { metersToStagePx, worldToScreen } from './canvasGeometry';

const DEFAULT_SIZE_M = 1;

export function PlacementPreview({ item, worldPos, scale, offsetX, offsetY }) {
  const [image] = useImage(item.imageDataUrl || '');
  if (!worldPos) return null;

  const widthM = item.width || DEFAULT_SIZE_M;
  const heightM = item.height || DEFAULT_SIZE_M;
  const { x: pxX, y: pxY } = worldToScreen(worldPos.x, worldPos.y, scale, offsetX, offsetY);
  const pxW = metersToStagePx(widthM, scale);
  const pxH = metersToStagePx(heightM, scale);

  return (
    <Group x={pxX} y={pxY} listening={false} opacity={0.65}>
      {item.imageDataUrl && image ? (
        <KonvaImage image={image} x={-pxW / 2} y={-pxH / 2} width={pxW} height={pxH} />
      ) : (
        <Rect
          x={-pxW / 2}
          y={-pxH / 2}
          width={pxW}
          height={pxH}
          fill="#93C5FD"
          stroke="#4338ca"
          strokeWidth={1.5}
          dash={[6, 4]}
          cornerRadius={3}
        />
      )}
      <Text
        text={item.label}
        x={-pxW / 2}
        y={-pxH / 2}
        width={pxW}
        height={pxH}
        align="center"
        verticalAlign="middle"
        fontSize={11}
        fill="#111827"
      />
    </Group>
  );
}
