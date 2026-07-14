import * as THREE from 'three';

// Parametric "archetype" shapes: hand-drawn Three.js silhouettes that stand
// in for a real 3D model, keyed by archetype name (see
// PRODUCT_ARCHETYPE_BY_CATEGORY in ../../domain/productShapeCatalog.js).
// Every component takes the same {width, depth, height, fill} shape so the
// lookup table in Design3DView.jsx can render any of them uniformly.

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function PlainBox({ width, depth, height, fill }) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={fill} />
    </mesh>
  );
}

// Ascending steps, low to high — a recognizable staircase silhouette
// instead of a flat box.
export function StairsShape3D({ width, depth, height, fill }) {
  const stepCount = 6;
  const stepDepth = depth / stepCount;
  return (
    <group>
      {Array.from({ length: stepCount }).map((_, i) => {
        const stepHeight = (height / stepCount) * (i + 1);
        const zCenter = -depth / 2 + stepDepth * (i + 0.5);
        return (
          <mesh key={i} position={[0, stepHeight / 2, zCenter]}>
            <boxGeometry args={[width, stepHeight, stepDepth]} />
            <meshStandardMaterial color={fill} />
          </mesh>
        );
      })}
    </group>
  );
}

// Trunk + canopy, top-down footprint sets the canopy spread.
export function TreeShape3D({ width, depth, fill }) {
  const canopyRadius = Math.max(width, depth) / 2;
  const trunkHeight = Math.max(canopyRadius * 1.4, 0.4);
  return (
    <group>
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[canopyRadius * 0.12, canopyRadius * 0.18, trunkHeight, 8]} />
        <meshStandardMaterial color="#78350F" />
      </mesh>
      <mesh position={[0, trunkHeight + canopyRadius * 0.75, 0]}>
        <sphereGeometry args={[canopyRadius, 14, 14]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

export function TableShape3D({ width, depth, height, fill }) {
  const topThickness = Math.min(height * 0.1, 0.05);
  const legHeight = Math.max(height - topThickness, 0.05);
  const legSize = Math.max(Math.min(width, depth) * 0.08, 0.03);
  const legOffsetX = width / 2 - legSize;
  const legOffsetZ = depth / 2 - legSize;
  return (
    <group>
      <mesh position={[0, legHeight + topThickness / 2, 0]}>
        <boxGeometry args={[width, topThickness, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * legOffsetX, legHeight / 2, sz * legOffsetZ]}>
          <boxGeometry args={[legSize, legHeight, legSize]} />
          <meshStandardMaterial color="#78350F" />
        </mesh>
      ))}
    </group>
  );
}

export function ChairShape3D({ width, depth, height, fill, hasBack = true }) {
  const seatHeight = height * 0.5;
  const seatThickness = Math.min(height * 0.1, 0.05);
  const backHeight = Math.max(height - seatHeight, 0.05);
  const legSize = Math.max(Math.min(width, depth) * 0.08, 0.025);
  return (
    <group>
      <mesh position={[0, seatHeight, 0]}>
        <boxGeometry args={[width, seatThickness, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {hasBack && (
        <mesh position={[0, seatHeight + backHeight / 2, -depth / 2 + legSize / 2]}>
          <boxGeometry args={[width, backHeight, legSize]} />
          <meshStandardMaterial color="#78716C" />
        </mesh>
      )}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (width / 2 - legSize / 2), seatHeight / 2, sz * (depth / 2 - legSize / 2)]}>
          <boxGeometry args={[legSize, seatHeight, legSize]} />
          <meshStandardMaterial color="#57534E" />
        </mesh>
      ))}
    </group>
  );
}

// Backless variant of ChairShape3D — stools, ottomans, piano/bar seating.
export function StoolShape3D(props) {
  return <ChairShape3D {...props} hasBack={false} />;
}

// A leaf standing open at roughly the angle the 2D swing-arc icon implies,
// hinged at one corner of the footprint.
export function DoorShape3D({ width, depth, height }) {
  const leafThickness = Math.max(Math.min(width, depth) * 0.08, 0.03);
  const leafLength = Math.max(width, 0.6);
  return (
    <group position={[-width / 2, 0, -depth / 2]}>
      <mesh position={[0, height / 2, leafLength / 2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[leafLength, height, leafThickness]} />
        <meshStandardMaterial color="#A8A29E" />
      </mesh>
    </group>
  );
}

// A wall-mounted pane: an outer frame box, an inset glass slab, and a thin
// mullion bar splitting it — reads as a window, not a wall. The glass
// deliberately ignores `fill` (the object's arbitrary product/facility
// color has nothing to do with what's outside) and instead glows a bright,
// slightly warm sky-white so the window always reads as a bright opening to
// the outside rather than a flat tinted panel.
export function WindowShape3D({ width, depth, height }) {
  const frameThickness = Math.max(Math.min(width, height) * 0.06, 0.02);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#E5E7EB" />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[Math.max(width - frameThickness * 2, 0.02), Math.max(height - frameThickness * 2, 0.02), depth * 0.5]} />
        <meshStandardMaterial
          color="#F8FBFF"
          emissive="#DCEBFF"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[Math.max(width - frameThickness * 2, 0.02), frameThickness * 0.6, depth * 0.7]} />
        <meshStandardMaterial color="#E5E7EB" />
      </mesh>
    </group>
  );
}

// A flat slab plus a raised strip near one edge, like a duvet with its top
// corner turned down.
export function BlanketShape3D({ width, depth, height, fill }) {
  const foldDepth = depth * 0.22;
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height * 1.4, -depth / 2 + foldDepth / 2]}>
        <boxGeometry args={[width * 0.98, height * 0.8, foldDepth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

export function SofaShape3D({ width, depth, height, fill }) {
  const armWidth = Math.min(width * 0.12, 0.2);
  const legHeight = Math.max(height * 0.1, 0.08);
  const seatThickness = Math.max(height * 0.3, 0.1);
  const backHeight = Math.max(height - legHeight - seatThickness, 0.1);
  const innerWidth = Math.max(width - armWidth * 2, 0.1);
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (width / 2 - armWidth / 2), legHeight / 2, sz * (depth / 2 - armWidth / 2)]}>
          <boxGeometry args={[armWidth * 0.5, legHeight, armWidth * 0.5]} />
          <meshStandardMaterial color="#57534E" />
        </mesh>
      ))}
      <mesh position={[0, legHeight + seatThickness / 2, depth * 0.05]}>
        <boxGeometry args={[innerWidth, seatThickness, depth * 0.75]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, legHeight + seatThickness + backHeight / 2, -depth / 2 + depth * 0.1]}>
        <boxGeometry args={[innerWidth, backHeight, depth * 0.2]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (width / 2 - armWidth / 2), legHeight + (seatThickness + backHeight * 0.6) / 2, 0]}>
          <boxGeometry args={[armWidth, seatThickness + backHeight * 0.6, depth * 0.9]} />
          <meshStandardMaterial color={fill} />
        </mesh>
      ))}
    </group>
  );
}

export function ShelfShape3D({ width, depth, height, fill }) {
  const boardThickness = Math.max(Math.min(height * 0.04, 0.03), 0.015);
  const sideThickness = Math.max(Math.min(width * 0.04, 0.03), 0.015);
  const shelfCount = 4;
  return (
    <group>
      <mesh position={[0, height / 2, -depth / 2 + boardThickness / 2]}>
        <boxGeometry args={[width, height, boardThickness]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (width / 2 - sideThickness / 2), height / 2, 0]}>
          <boxGeometry args={[sideThickness, height, depth]} />
          <meshStandardMaterial color={fill} />
        </mesh>
      ))}
      {Array.from({ length: shelfCount }).map((_, i) => {
        const y = clamp((height / (shelfCount - 1)) * i, boardThickness / 2, height - boardThickness / 2);
        return (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[width - sideThickness * 2, boardThickness, depth]} />
            <meshStandardMaterial color={fill} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CabinetShape3D({ width, depth, height, fill }) {
  const handleSize = Math.max(Math.min(width, height) * 0.05, 0.015);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height / 2, depth / 2 + 0.001]}>
        <boxGeometry args={[Math.max(width * 0.01, 0.005), height * 0.96, 0.002]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * width * 0.1, height / 2, depth / 2 + handleSize / 2]}>
          <boxGeometry args={[handleSize * 0.3, handleSize * 1.5, handleSize * 0.3]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}
    </group>
  );
}

// Taller CabinetShape3D with a cornice cap — wardrobes/closets/armoires read
// as a piece of furniture rather than a generic cabinet box.
export function WardrobeShape3D({ width, depth, height, fill }) {
  const corniceHeight = Math.max(height * 0.04, 0.03);
  return (
    <group>
      <CabinetShape3D width={width} depth={depth} height={height - corniceHeight} fill={fill} />
      <mesh position={[0, height - corniceHeight / 2, 0]}>
        <boxGeometry args={[width * 1.03, corniceHeight, depth * 1.05]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
}

// A stack of drawer faces (each with its own handle) instead of a single
// cabinet door — reads as a dresser/chest of drawers/nightstand.
export function DrawerChestShape3D({ width, depth, height, fill }) {
  const rowCount = 4;
  const rowHeight = height / rowCount;
  const gap = Math.min(rowHeight * 0.08, 0.015);
  const handleWidth = Math.max(width * 0.18, 0.05);
  const handleHeight = Math.max(rowHeight * 0.08, 0.01);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {Array.from({ length: rowCount }).map((_, i) => {
        const y = rowHeight * (i + 0.5);
        return (
          <group key={i}>
            <mesh position={[0, y, depth / 2 + 0.001]}>
              <boxGeometry args={[width - gap * 2, rowHeight - gap, 0.002]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
            <mesh position={[0, y, depth / 2 + 0.006]}>
              <boxGeometry args={[handleWidth, handleHeight, 0.008]} />
              <meshStandardMaterial color="#1F2937" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// A thin flat slab with a contrasting inset border — reads as a rug/mat
// rather than a raised box.
export function RugShape3D({ width, depth, height, fill }) {
  const thickness = Math.max(Math.min(height, 0.03), 0.008);
  const borderInset = Math.min(width, depth) * 0.08;
  return (
    <group>
      <mesh position={[0, thickness / 2, 0]}>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, thickness + 0.001, 0]}>
        <boxGeometry args={[Math.max(width - borderInset, 0.05), 0.002, Math.max(depth - borderInset, 0.05)]} />
        <meshStandardMaterial color={fill} opacity={0.7} transparent />
      </mesh>
    </group>
  );
}

// Thin wall frame + reflective/pictorial inset pane — mirrors, picture
// frames, whiteboards, wall clocks, partitions.
export function MirrorFrameShape3D({ width, depth, height, fill }) {
  const frameThickness = Math.max(Math.min(width, height) * 0.05, 0.015);
  // Mirrors/partitions/whiteboards are thin panels regardless of how deep a
  // footprint was drawn for them in 2D — using the raw `depth` here would
  // render a solid block whenever that footprint isn't already thin, which
  // reads as just another box instead of a wall-mounted pane.
  const panelDepth = Math.min(depth, Math.max(Math.min(width, height) * 0.06, 0.03));
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, panelDepth]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, height / 2, panelDepth / 2 + 0.002]}>
        <boxGeometry args={[Math.max(width - frameThickness * 2, 0.02), Math.max(height - frameThickness * 2, 0.02), 0.004]} />
        <meshStandardMaterial color={fill} metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Counter slab + recessed basin + an arched faucet — sinks/vanities.
export function SinkBasinShape3D({ width, depth, height, fill }) {
  const counterHeight = height * 0.9;
  const basinRadius = Math.min(width, depth) * 0.32;
  const faucetHeight = Math.max(height - counterHeight, 0.1);
  return (
    <group>
      <mesh position={[0, counterHeight / 2, 0]}>
        <boxGeometry args={[width, counterHeight, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, counterHeight - basinRadius * 0.3, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[basinRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#F3F4F6" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, counterHeight + faucetHeight / 2, -depth * 0.3]}>
        <cylinderGeometry args={[basinRadius * 0.08, basinRadius * 0.08, faucetHeight, 8]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

// Tank + bowl + seat — reads as a toilet, not a box.
export function ToiletShape3D({ width, depth, height, fill }) {
  const tankHeight = height * 0.55;
  const tankDepth = depth * 0.3;
  const bowlRadius = Math.min(width, depth) * 0.4;
  return (
    <group>
      <mesh position={[0, height - tankHeight / 2, -depth / 2 + tankDepth / 2]}>
        <boxGeometry args={[width * 0.8, tankHeight, tankDepth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, bowlRadius * 0.9, depth * 0.1]}>
        <cylinderGeometry args={[bowlRadius, bowlRadius * 0.7, bowlRadius * 1.6, 16]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, bowlRadius * 1.75, depth * 0.1]} scale={[1, 0.25, 1.2]}>
        <sphereGeometry args={[bowlRadius, 16, 8]} />
        <meshStandardMaterial color="#F9FAFB" />
      </mesh>
    </group>
  );
}

// Outer shell + a recessed, deeper-toned interior cavity — reads as a
// bathtub/shower basin.
export function BathtubShape3D({ width, depth, height, fill }) {
  const wallThickness = Math.max(Math.min(width, depth) * 0.08, 0.03);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height - wallThickness / 2 + 0.01, 0]}>
        <boxGeometry args={[width - wallThickness * 2, wallThickness, depth - wallThickness * 2]} />
        <meshStandardMaterial color="#E5E7EB" />
      </mesh>
      <mesh position={[0, height + 0.05, -depth / 2 + wallThickness]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

export function MonitorShape3D({ width, depth, height, fill }) {
  const footprint = Math.min(width, depth);
  const baseHeight = Math.max(Math.min(height * 0.06, 0.03), 0.01);
  const neckHeight = Math.max(height * 0.25, 0.05);
  const screenHeight = Math.max(height - baseHeight - neckHeight, 0.1);
  const screenThickness = Math.max(Math.min(depth * 0.2, 0.04), 0.015);
  return (
    <group>
      <mesh position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[footprint * 0.4, footprint * 0.45, baseHeight, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, baseHeight + neckHeight / 2, 0]}>
        <boxGeometry args={[footprint * 0.12, neckHeight, footprint * 0.12]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, baseHeight + neckHeight + screenHeight / 2, 0]}>
        <boxGeometry args={[width, screenHeight, screenThickness]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

// Box body + a couple of round driver discs on the front face.
export function SpeakerShape3D({ width, depth, height, fill }) {
  const driverRadius = Math.min(width, height) * 0.28;
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height * 0.65, depth / 2 + 0.002]}>
        <cylinderGeometry args={[driverRadius, driverRadius, 0.01, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0, height * 0.3, depth / 2 + 0.002]}>
        <cylinderGeometry args={[driverRadius * 0.6, driverRadius * 0.6, 0.01, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

// A tapered frustum reads as a bin far better than a straight-walled box.
export function TrashBinShape3D({ width, depth, height, fill }) {
  const topRadius = Math.min(width, depth) * 0.5;
  const bottomRadius = topRadius * 0.75;
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[topRadius, bottomRadius, height, 16]} />
      <meshStandardMaterial color={fill} />
    </mesh>
  );
}

// Tall cabinet body with repeated horizontal slot lines and a couple of LED
// accent boxes — reads as server/network rack equipment.
export function ServerRackShape3D({ width, depth, height, fill }) {
  const slotCount = 8;
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {Array.from({ length: slotCount }).map((_, i) => (
        <mesh key={i} position={[0, (height / slotCount) * (i + 0.5), depth / 2 + 0.001]}>
          <boxGeometry args={[width * 0.92, height / slotCount * 0.15, 0.002]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      <mesh position={[width * 0.35, height * 0.9, depth / 2 + 0.003]}>
        <boxGeometry args={[0.02, 0.02, 0.005]} />
        <meshStandardMaterial color="#22C55E" />
      </mesh>
    </group>
  );
}

export function LampShape3D({ width, depth, height, fill }) {
  const baseRadius = Math.max(Math.min(width, depth) * 0.45, 0.05);
  const baseHeight = Math.max(Math.min(height * 0.05, 0.03), 0.01);
  const poleRadius = baseRadius * 0.15;
  const shadeHeight = Math.max(height * 0.25, 0.08);
  const poleHeight = Math.max(height - baseHeight - shadeHeight, 0.1);
  return (
    <group>
      <mesh position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius * 1.1, baseHeight, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, baseHeight + poleHeight / 2, 0]}>
        <cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 8]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
      <mesh position={[0, baseHeight + poleHeight + shadeHeight / 2, 0]}>
        <cylinderGeometry args={[baseRadius * 0.5, baseRadius * 0.9, shadeHeight, 16, 1, true]} />
        <meshStandardMaterial color={fill} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Ceiling-anchored cord + hanging shade, no floor base — pendant lights,
// chandeliers.
export function PendantLampShape3D({ width, depth, height, fill }) {
  const shadeRadius = Math.max(Math.min(width, depth) * 0.45, 0.05);
  const shadeHeight = Math.max(height * 0.3, 0.1);
  const cordHeight = Math.max(height - shadeHeight, 0.1);
  return (
    <group>
      <mesh position={[0, height - cordHeight / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, cordHeight, 6]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, shadeHeight / 2, 0]}>
        <cylinderGeometry args={[shadeRadius * 0.4, shadeRadius, shadeHeight, 16, 1, true]} />
        <meshStandardMaterial color={fill} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Pole + base + a tilted wide guard disc — floor/pedestal fans.
export function FloorFanShape3D({ width, depth, height, fill }) {
  const baseRadius = Math.max(Math.min(width, depth) * 0.4, 0.05);
  const poleHeight = height * 0.75;
  const headRadius = Math.max(Math.min(width, depth) * 0.5, 0.08);
  return (
    <group>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius * 1.1, 0.02, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[baseRadius * 0.12, baseRadius * 0.12, poleHeight, 8]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
      <mesh position={[0, poleHeight + headRadius * 0.3, 0]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[headRadius, headRadius, headRadius * 0.25, 20]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

// Center pole + base + several angled hook stubs near the top.
export function CoatRackShape3D({ width, depth, height, fill }) {
  const baseRadius = Math.max(Math.min(width, depth) * 0.4, 0.05);
  const hookCount = 5;
  const hookY = height * 0.85;
  return (
    <group>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius * 1.1, 0.02, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[baseRadius * 0.1, baseRadius * 0.1, height, 8]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {Array.from({ length: hookCount }).map((_, i) => {
        const angle = (i / hookCount) * Math.PI * 2;
        const hookLength = baseRadius * 0.6;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * hookLength * 0.5, hookY, Math.sin(angle) * hookLength * 0.5]}
            rotation={[0, -angle, Math.PI / 3]}
          >
            <cylinderGeometry args={[0.008, 0.008, hookLength, 6]} />
            <meshStandardMaterial color="#57534E" />
          </mesh>
        );
      })}
    </group>
  );
}

// A rod + a hanging panel with a few vertical fold ridges.
export function CurtainShape3D({ width, depth, height, fill }) {
  const foldCount = 5;
  const panelThickness = Math.max(Math.min(depth, 0.06), 0.02);
  return (
    <group>
      <mesh position={[0, height, 0]}>
        <cylinderGeometry args={[0.012, 0.012, width, 8]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#78716C" />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, panelThickness]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      {Array.from({ length: foldCount }).map((_, i) => {
        const x = -width / 2 + (width / (foldCount - 1)) * i;
        return (
          <mesh key={i} position={[x, height / 2, panelThickness / 2 + 0.005]}>
            <boxGeometry args={[width * 0.06, height * 0.98, 0.01]} />
            <meshStandardMaterial color={fill} />
          </mesh>
        );
      })}
    </group>
  );
}

// A generic door + control-panel front reads as a boxed appliance
// (microwave, fridge, washer, ...) without needing a distinct model per
// appliance type.
export function ApplianceShape3D({ width, depth, height, fill }) {
  const doorInset = Math.max(Math.min(width, height) * 0.06, 0.01);
  const panelWidth = width * 0.12;
  const windowWidth = Math.max(width - doorInset * 2 - panelWidth, 0.02);
  const windowHeight = height - doorInset * 2;
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[-panelWidth / 2, height / 2, depth / 2 + 0.002]}>
        <boxGeometry args={[windowWidth, windowHeight, 0.004]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[width / 2 - panelWidth / 2 - doorInset / 2, height / 2, depth / 2 + 0.002]}>
        <boxGeometry args={[panelWidth, windowHeight, 0.004]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

// Low frame + a thicker mattress slab, with a headboard at one end and a
// pair of pillow bumps so it reads as a bed rather than a plain platform.
export function BedShape3D({ width, depth, height, fill }) {
  const frameHeight = Math.max(height * 0.3, 0.15);
  const mattressHeight = Math.max(height - frameHeight, 0.1);
  const headboardHeight = height + Math.max(depth * 0.25, 0.15);
  const headboardThickness = Math.max(Math.min(depth * 0.06, 0.06), 0.02);
  const pillowWidth = width * 0.35;
  const pillowDepth = depth * 0.18;
  const pillowHeight = Math.max(mattressHeight * 0.4, 0.05);
  return (
    <group>
      <mesh position={[0, frameHeight / 2, 0]}>
        <boxGeometry args={[width, frameHeight, depth]} />
        <meshStandardMaterial color="#78716C" />
      </mesh>
      <mesh position={[0, frameHeight + mattressHeight / 2, 0]}>
        <boxGeometry args={[width * 0.98, mattressHeight, depth * 0.98]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, headboardHeight / 2, -depth / 2 - headboardThickness / 2]}>
        <boxGeometry args={[width, headboardHeight, headboardThickness]} />
        <meshStandardMaterial color="#57534E" />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[sx * (pillowWidth / 2 + width * 0.05), frameHeight + mattressHeight + pillowHeight / 2, -depth / 2 + pillowDepth]}
        >
          <boxGeometry args={[pillowWidth, pillowHeight, pillowDepth]} />
          <meshStandardMaterial color="#F5F5F4" />
        </mesh>
      ))}
    </group>
  );
}

// A squashed ellipsoid reads as a soft cushion far better than a box.
export function PillowShape3D({ width, depth, height, fill }) {
  return (
    <mesh position={[0, height / 2, 0]} scale={[width / 2, height / 2, depth / 2]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={fill} />
    </mesh>
  );
}

// Gun-shaped silhouette: a horizontal barrel plus a perpendicular handle,
// which reads as a hair dryer far better than a plain box.
export function HairDryerShape3D({ width, depth, height, fill }) {
  const barrelLength = Math.max(width, depth);
  const barrelRadius = Math.min(height, Math.min(width, depth)) * 0.4;
  const handleLength = Math.max(height - barrelRadius, barrelRadius * 1.5);
  const handleRadius = barrelRadius * 0.55;
  return (
    <group>
      <mesh position={[0, height - barrelRadius, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barrelRadius, barrelRadius * 0.7, barrelLength, 16]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height - barrelRadius - handleLength / 2, 0]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[handleRadius, handleRadius * 0.85, handleLength, 12]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

// Inclined deck + a console on a post + two side rails.
export function TreadmillShape3D({ width, depth, height, fill }) {
  const deckHeight = Math.max(height * 0.15, 0.1);
  const railHeight = Math.max(height - deckHeight, 0.15);
  const consoleWidth = width * 0.7;
  return (
    <group>
      <mesh position={[0, deckHeight / 2, 0]} rotation={[-0.06, 0, 0]}>
        <boxGeometry args={[width * 0.8, deckHeight, depth]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * width * 0.42, railHeight / 2 + deckHeight, -depth * 0.1]}>
          <boxGeometry args={[width * 0.05, railHeight, depth * 0.6]} />
          <meshStandardMaterial color="#9CA3AF" />
        </mesh>
      ))}
      <mesh position={[0, railHeight + deckHeight, -depth / 2 + 0.05]}>
        <boxGeometry args={[consoleWidth, height * 0.2, 0.05]} />
        <meshStandardMaterial color={fill} />
      </mesh>
    </group>
  );
}

// Post + saddle + frame boxes + pedal cylinders + handlebar.
export function ExerciseBikeShape3D({ width, depth, height, fill }) {
  const seatHeight = height * 0.85;
  const pedalRadius = Math.min(width, depth) * 0.18;
  return (
    <group>
      <mesh position={[0, height * 0.15, 0]}>
        <boxGeometry args={[width * 0.7, height * 0.06, depth * 0.9]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, seatHeight * 0.55, -depth * 0.15]}>
        <cylinderGeometry args={[0.02, 0.02, seatHeight, 8]} />
        <meshStandardMaterial color="#57534E" />
      </mesh>
      <mesh position={[0, seatHeight, -depth * 0.15]}>
        <boxGeometry args={[width * 0.3, height * 0.06, depth * 0.25]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height * 0.6, depth * 0.3]}>
        <boxGeometry args={[width * 0.35, height * 0.04, depth * 0.04]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, pedalRadius, depth * 0.15]}>
        <cylinderGeometry args={[pedalRadius, pedalRadius, 0.02, 12]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

// Body box + a lighter key-lid strip + short legs — upright/keyboard piano.
export function PianoShape3D({ width, depth, height, fill }) {
  const legHeight = Math.max(height * 0.1, 0.06);
  const bodyHeight = height - legHeight;
  return (
    <group>
      <mesh position={[0, legHeight + bodyHeight / 2, 0]}>
        <boxGeometry args={[width, bodyHeight, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, legHeight + bodyHeight * 0.85, depth / 2 + 0.005]}>
        <boxGeometry args={[width * 0.92, bodyHeight * 0.12, 0.02]} />
        <meshStandardMaterial color="#F9FAFB" />
      </mesh>
      {[[-1, -1], [1, -1], [0, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * width * 0.4, legHeight / 2, sz * depth * 0.4]}>
          <cylinderGeometry args={[0.02, 0.02, legHeight, 8]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}
    </group>
  );
}

// A shallow wall-mounted box with a front vent slit and a small display —
// reads as a split-type indoor AC unit rather than a full-depth appliance.
export function WallMountedACShape3D({ width, depth, height, fill }) {
  const bodyDepth = Math.min(depth, Math.max(Math.min(width, height) * 0.35, 0.12));
  const ventHeight = Math.max(height * 0.18, 0.02);
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, bodyDepth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height * 0.18, bodyDepth / 2 + 0.002]}>
        <boxGeometry args={[width * 0.92, ventHeight, 0.006]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[width * 0.3, height * 0.75, bodyDepth / 2 + 0.002]}>
        <boxGeometry args={[width * 0.1, height * 0.05, 0.004]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

// A tall narrow tower with a vertical vent strip — reads as a free-standing
// floor AC unit.
export function StandingACShape3D({ width, depth, height, fill }) {
  const footHeight = Math.max(height * 0.04, 0.02);
  return (
    <group>
      <mesh position={[0, footHeight + (height - footHeight) / 2, 0]}>
        <boxGeometry args={[width, height - footHeight, depth]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, height * 0.5, depth / 2 + 0.002]}>
        <boxGeometry args={[width * 0.15, height * 0.7, 0.006]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, height * 0.85, depth / 2 + 0.002]}>
        <boxGeometry args={[width * 0.3, height * 0.04, 0.004]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

// Keyed by archetype name (not category id) — see productShapeCatalog.js
// for the category -> archetype mapping.
export const ARCHETYPE_COMPONENTS = {
  chair: ChairShape3D,
  stairs: StairsShape3D,
  stool: StoolShape3D,
  table: TableShape3D,
  sofa: SofaShape3D,
  shelf: ShelfShape3D,
  cabinet: CabinetShape3D,
  wardrobe: WardrobeShape3D,
  drawer_chest: DrawerChestShape3D,
  rug: RugShape3D,
  mirror_frame: MirrorFrameShape3D,
  sink_basin: SinkBasinShape3D,
  toilet: ToiletShape3D,
  bathtub: BathtubShape3D,
  monitor: MonitorShape3D,
  speaker: SpeakerShape3D,
  trash_bin: TrashBinShape3D,
  server_rack: ServerRackShape3D,
  lamp: LampShape3D,
  pendant_lamp: PendantLampShape3D,
  floor_fan: FloorFanShape3D,
  coat_rack: CoatRackShape3D,
  window: WindowShape3D,
  curtain: CurtainShape3D,
  plant: TreeShape3D,
  appliance: ApplianceShape3D,
  wall_mounted_ac: WallMountedACShape3D,
  standing_ac: StandingACShape3D,
  bed: BedShape3D,
  blanket: BlanketShape3D,
  pillow: PillowShape3D,
  hairdryer: HairDryerShape3D,
  treadmill: TreadmillShape3D,
  exercise_bike: ExerciseBikeShape3D,
  piano: PianoShape3D,
};
