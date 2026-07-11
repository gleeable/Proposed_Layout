import { Arc, Arrow, Circle, Line, Rect } from 'react-konva';

// Categories with a recognizable top-down floor-plan symbol instead of a
// plain colored rectangle. Anything not in this set falls back to the
// generic Rect/Image rendering in PlacedObjectShape/PlacementPreview.
export const SHAPED_FACILITY_CATEGORIES = new Set(['stairs', 'tree', 'table', 'chair', 'door']);

function StairsIcon({ pxW, pxH, fill, isSelected }) {
  const halfW = pxW / 2;
  const halfH = pxH / 2;
  const treadCount = 6;
  const treads = [];
  for (let i = 1; i < treadCount; i += 1) {
    const y = -halfH + (pxH / treadCount) * i;
    treads.push(<Line key={i} points={[-halfW, y, halfW, y]} stroke="#4B5563" strokeWidth={1} listening={false} />);
  }
  return (
    <>
      <Rect
        x={-halfW}
        y={-halfH}
        width={pxW}
        height={pxH}
        fill={fill}
        stroke={isSelected ? '#4338ca' : '#6B7280'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
      />
      {treads}
      <Arrow
        points={[0, halfH - 4, 0, -halfH + 4]}
        stroke="#374151"
        fill="#374151"
        strokeWidth={1.5}
        pointerLength={6}
        pointerWidth={6}
        listening={false}
      />
    </>
  );
}

function TreeIcon({ pxW, pxH, fill, isSelected }) {
  const r = Math.min(pxW, pxH) / 2;
  return (
    <>
      <Circle radius={r} fill={fill} stroke={isSelected ? '#4338ca' : '#166534'} strokeWidth={isSelected ? 2 : 1.5} />
      <Circle radius={r * 0.55} fill="#16A34A" opacity={0.55} listening={false} />
      <Circle radius={r * 0.12} fill="#78350F" listening={false} />
    </>
  );
}

function TableIcon({ pxW, pxH, fill, isSelected }) {
  const halfW = pxW / 2;
  const halfH = pxH / 2;
  const legSize = Math.min(pxW, pxH) * 0.14;
  const legInsetX = halfW - legSize * 0.8;
  const legInsetY = halfH - legSize * 0.8;
  const legs = [
    [-legInsetX, -legInsetY],
    [legInsetX, -legInsetY],
    [-legInsetX, legInsetY],
    [legInsetX, legInsetY],
  ];
  return (
    <>
      <Rect
        x={-halfW}
        y={-halfH}
        width={pxW}
        height={pxH}
        fill={fill}
        stroke={isSelected ? '#4338ca' : '#92400E'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={3}
      />
      {legs.map(([cx, cy], i) => (
        <Rect
          key={i}
          x={cx - legSize / 2}
          y={cy - legSize / 2}
          width={legSize}
          height={legSize}
          fill="#78350F"
          listening={false}
        />
      ))}
    </>
  );
}

function ChairIcon({ pxW, pxH, fill, isSelected }) {
  const halfW = pxW / 2;
  const halfH = pxH / 2;
  const backThickness = pxH * 0.22;
  return (
    <>
      <Rect
        x={-halfW}
        y={-halfH + backThickness}
        width={pxW}
        height={pxH - backThickness}
        fill={fill}
        stroke={isSelected ? '#4338ca' : '#57534E'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
      />
      <Rect
        x={-halfW}
        y={-halfH}
        width={pxW}
        height={backThickness}
        fill="#78716C"
        cornerRadius={[2, 2, 0, 0]}
        listening={false}
      />
    </>
  );
}

function DoorIcon({ pxW, pxH, isSelected }) {
  const radius = Math.min(pxW, pxH);
  const hingeX = -pxW / 2;
  const hingeY = -pxH / 2;
  return (
    <>
      {/* wall opening the door sits in */}
      <Line points={[-pxW / 2, -pxH / 2, pxW / 2, -pxH / 2]} stroke="#A8A29E" strokeWidth={3} listening={false} />
      {/* swing path */}
      <Arc
        x={hingeX}
        y={hingeY}
        innerRadius={Math.max(0, radius - 1)}
        outerRadius={radius}
        angle={90}
        rotation={0}
        fill={isSelected ? '#4338ca' : '#A8A29E'}
        opacity={0.45}
        listening={false}
      />
      {/* door leaf, drawn fully open */}
      <Line
        points={[hingeX, hingeY, hingeX, hingeY + radius]}
        stroke={isSelected ? '#4338ca' : '#57534E'}
        strokeWidth={2}
        listening={false}
      />
      {/* invisible hit area so the whole footprint is clickable/draggable, not just the thin lines */}
      <Rect x={-pxW / 2} y={-pxH / 2} width={pxW} height={pxH} fill="transparent" />
    </>
  );
}

export function FacilityIcon({ category, pxW, pxH, fill, isSelected }) {
  switch (category) {
    case 'stairs':
      return <StairsIcon pxW={pxW} pxH={pxH} fill={fill} isSelected={isSelected} />;
    case 'tree':
      return <TreeIcon pxW={pxW} pxH={pxH} fill={fill} isSelected={isSelected} />;
    case 'table':
      return <TableIcon pxW={pxW} pxH={pxH} fill={fill} isSelected={isSelected} />;
    case 'chair':
      return <ChairIcon pxW={pxW} pxH={pxH} fill={fill} isSelected={isSelected} />;
    case 'door':
      return <DoorIcon pxW={pxW} pxH={pxH} isSelected={isSelected} />;
    default:
      return null;
  }
}
