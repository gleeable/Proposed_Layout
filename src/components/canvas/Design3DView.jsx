import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import './Design3DView.css';

const DEFAULT_FLOOR_HEIGHT_M = 3;
const MIN_FLOOR_HEIGHT_M = 2.2;
const WALL_THICKNESS_M = 0.15;
const WALL_COLOR = '#c7d2fe';
const FLOOR_COLOR = '#f3f4f6';
const WALK_SPEED_M_S = 1.4; // an average adult walking pace
const PERSON_RADIUS_M = 0.25; // keeps the avatar from walking through walls/furniture
const PERSON_HIDE_DELAY_S = 2; // hide the avatar after this long with no arrow key held
const CHAIR_SEAT_HEIGHT_RATIO = 0.5; // must match ChairShape3D's own seatHeight = height * 0.5

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const SHAPED_3D_CATEGORIES = new Set(['stairs', 'tree', 'table', 'chair', 'door']);

// Guesses a hand-drawn shape category from a product's free-text name, since
// registered products have no fixed category the way facilities do. Falls
// back to a plain box for anything unrecognized.
const PRODUCT_CATEGORY_KEYWORDS = [
  { category: 'chair', keywords: ['의자', '체어', 'chair', '스툴', 'stool'] },
  { category: 'table', keywords: ['테이블', '책상', '데스크', 'table', 'desk'] },
  { category: 'sofa', keywords: ['소파', '카우치', '벤치', 'sofa', 'couch', 'bench'] },
  { category: 'shelf', keywords: ['선반', '책장', '책꽂이', 'shelf', 'bookcase', 'rack'] },
  { category: 'cabinet', keywords: ['캐비닛', '서랍장', '수납장', 'cabinet', 'drawer', 'locker'] },
  { category: 'monitor', keywords: ['모니터', '티비', 'tv', '컴퓨터', '노트북', 'monitor', 'screen', 'laptop'] },
  { category: 'lamp', keywords: ['조명', '램프', '스탠드', 'lamp', 'light'] },
  { category: 'plant', keywords: ['화분', '식물', '나무', 'plant', 'pot'] },
  {
    category: 'appliance',
    keywords: [
      '전자레인지', '오븐', '냉장고', '세탁기', '건조기', '식기세척기', '정수기', '에어컨',
      'microwave', 'oven', 'refrigerator', 'fridge', 'washer', 'washing machine', 'dryer',
      'dishwasher', 'purifier', 'air conditioner', 'appliance',
    ],
  },
];

function inferProductShapeCategory(label) {
  const text = (label || '').toLowerCase();
  const match = PRODUCT_CATEGORY_KEYWORDS.find(({ keywords }) => (
    keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  ));
  return match?.category || 'box';
}

// There's no real geometry to draw the product's actual look, so this
// samples the average color of its (background-removed) photo and uses that
// to tint the hand-drawn shape — gets the shape roughly the right color
// without needing a real 3D model.
function useAverageColor(imageUrl) {
  const [color, setColor] = useState(null);
  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 32) continue; // skip transparent background pixels
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count += 1;
      }
      if (!cancelled) {
        setColor(count === 0 ? null : `#${[r, g, b].map((v) => Math.round(v / count).toString(16).padStart(2, '0')).join('')}`);
      }
    };
    img.onerror = () => {
      if (!cancelled) setColor(null);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return color;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Same x/z/rotation convention PlacedObject3D renders with: world position is
// (object.x - footprint.widthM/2, object.y - footprint.depthM/2) and the
// object's local frame is rotated by -radians(object.rotation). Used to test
// whether the person's world position falls inside a given object's footprint.
function worldToObjectLocal(worldX, worldZ, object, footprint) {
  const objX = object.x - footprint.widthM / 2;
  const objZ = object.y - footprint.depthM / 2;
  const rotY = -THREE.MathUtils.degToRad(object.rotation || 0);
  const dx = worldX - objX;
  const dz = worldZ - objZ;
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
}

function isInsideObjectFootprint(local, object, margin) {
  return Math.abs(local.x) < object.width / 2 + margin && Math.abs(local.z) < object.height / 2 + margin;
}

function collidesWithAny(worldX, worldZ, objects, footprint) {
  return objects.some((object) => (
    isInsideObjectFootprint(worldToObjectLocal(worldX, worldZ, object, footprint), object, PERSON_RADIUS_M)
  ));
}

function WallMaterial() {
  return <meshStandardMaterial color={WALL_COLOR} transparent opacity={0.4} side={THREE.DoubleSide} />;
}

function Walls({ footprint, heightM }) {
  const wallY = heightM / 2;
  return (
    <group>
      <mesh position={[0, wallY, -footprint.depthM / 2]}>
        <boxGeometry args={[footprint.widthM + WALL_THICKNESS_M, heightM, WALL_THICKNESS_M]} />
        <WallMaterial />
      </mesh>
      <mesh position={[0, wallY, footprint.depthM / 2]}>
        <boxGeometry args={[footprint.widthM + WALL_THICKNESS_M, heightM, WALL_THICKNESS_M]} />
        <WallMaterial />
      </mesh>
      <mesh position={[-footprint.widthM / 2, wallY, 0]}>
        <boxGeometry args={[WALL_THICKNESS_M, heightM, footprint.depthM + WALL_THICKNESS_M]} />
        <WallMaterial />
      </mesh>
      <mesh position={[footprint.widthM / 2, wallY, 0]}>
        <boxGeometry args={[WALL_THICKNESS_M, heightM, footprint.depthM + WALL_THICKNESS_M]} />
        <WallMaterial />
      </mesh>
    </group>
  );
}

function ProductModel3D({ width, depth, height, modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const { scale, baseOffsetY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const candidates = [
      size.x > 0 ? width / size.x : null,
      size.z > 0 ? depth / size.z : null,
      size.y > 0 ? height / size.y : null,
    ].filter((v) => Number.isFinite(v) && v > 0);
    const s = candidates.length ? Math.min(...candidates) : 1;
    return { scale: s, baseOffsetY: -box.min.y * s };
  }, [cloned, width, depth, height]);

  return <primitive object={cloned} scale={scale} position={[0, baseOffsetY, 0]} />;
}

function PlainBox({ width, depth, height, fill }) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={fill} />
    </mesh>
  );
}

// Ascending steps, low to high — a recognizable staircase silhouette
// instead of a flat box.
function StairsShape3D({ width, depth, height, fill }) {
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
function TreeShape3D({ width, depth, fill }) {
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

function TableShape3D({ width, depth, height, fill }) {
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

function ChairShape3D({ width, depth, height, fill }) {
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
      <mesh position={[0, seatHeight + backHeight / 2, -depth / 2 + legSize / 2]}>
        <boxGeometry args={[width, backHeight, legSize]} />
        <meshStandardMaterial color="#78716C" />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (width / 2 - legSize / 2), seatHeight / 2, sz * (depth / 2 - legSize / 2)]}>
          <boxGeometry args={[legSize, seatHeight, legSize]} />
          <meshStandardMaterial color="#57534E" />
        </mesh>
      ))}
    </group>
  );
}

// A leaf standing open at roughly the angle the 2D swing-arc icon implies,
// hinged at one corner of the footprint.
function DoorShape3D({ width, depth, height }) {
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

function SofaShape3D({ width, depth, height, fill }) {
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

function ShelfShape3D({ width, depth, height, fill }) {
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

function CabinetShape3D({ width, depth, height, fill }) {
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

function MonitorShape3D({ width, depth, height, fill }) {
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

function LampShape3D({ width, depth, height, fill }) {
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

// A door with a dark window and a small control-panel strip reads as a
// generic box appliance (microwave, fridge, washer, ...) without needing a
// distinct model per appliance type.
function ApplianceShape3D({ width, depth, height, fill }) {
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

function ProductShape3D({ category, width, depth, height, fill }) {
  switch (category) {
    case 'chair':
      return <ChairShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'table':
      return <TableShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'sofa':
      return <SofaShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'shelf':
      return <ShelfShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'cabinet':
      return <CabinetShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'monitor':
      return <MonitorShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'lamp':
      return <LampShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'plant':
      return <TreeShape3D width={width} depth={depth} fill={fill} />;
    case 'appliance':
      return <ApplianceShape3D width={width} depth={depth} height={height} fill={fill} />;
    default:
      return <PlainBox width={width} depth={depth} height={height} fill={fill} />;
  }
}

function FacilityShape3D({ category, width, depth, height, fill }) {
  switch (category) {
    case 'stairs':
      return <StairsShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'tree':
      return <TreeShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'table':
      return <TableShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'chair':
      return <ChairShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'door':
      return <DoorShape3D width={width} depth={depth} height={height} />;
    default:
      return <PlainBox width={width} depth={depth} height={height} fill={fill} />;
  }
}

function PlacedObject3D({ object, footprint }) {
  const width = Math.max(0.05, object.width);
  const depth = Math.max(0.05, object.height);
  const heightM = Math.max(0.05, (object.verticalHeightMm || 800) / 1000);
  const elevationM = Math.max(0, object.elevationMm || 0) / 1000;
  const x = object.x - footprint.widthM / 2;
  const z = object.y - footprint.depthM / 2;
  const rotY = -THREE.MathUtils.degToRad(object.rotation || 0);
  // A hand-drawn shape doesn't look like the real product the way a photo
  // did, so show the label to make up for it — but not once a real 3D model
  // is available, since that already reads as the actual product.
  const showLabel = object.kind !== 'product' || !object.modelUrl;
  const isShapedFacility = object.kind === 'facility' && SHAPED_3D_CATEGORIES.has(object.category);
  const isShapedProduct = object.kind === 'product' && !object.modelUrl;
  // Gemini classifies the product name at registration time (more reliable
  // than the keyword list below); fall back to keyword matching for
  // products saved before that existed or when classification failed.
  const productCategory = isShapedProduct ? (object.shapeCategory || inferProductShapeCategory(object.label)) : null;
  const averageColor = useAverageColor(isShapedProduct ? object.imageDataUrl : null);

  return (
    <group position={[x, elevationM, z]} rotation={[0, rotY, 0]}>
      {object.modelUrl ? (
        <ProductModel3D width={width} depth={depth} height={heightM} modelUrl={object.modelUrl} />
      ) : isShapedProduct ? (
        <ProductShape3D category={productCategory} width={width} depth={depth} height={heightM} fill={averageColor || object.fill} />
      ) : isShapedFacility ? (
        <FacilityShape3D category={object.category} width={width} depth={depth} height={heightM} fill={object.fill} />
      ) : (
        <PlainBox width={width} depth={depth} height={heightM} fill={object.fill} />
      )}
      {showLabel && (
        <Html position={[0, heightM + 0.2, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="design-3d-view__label">{object.label}</div>
        </Html>
      )}
    </group>
  );
}

// Simple stylized walking figure — a capsule body, a head, and a small nose
// cone so its facing direction reads at a glance.
function Person({ footprint, floorObjects, keysHeldRef }) {
  const groupRef = useRef(null);
  const posRef = useRef({ x: 0, z: 0 });
  const heightRef = useRef(0);
  const headingRef = useRef(0);
  // Starts far in the past so the avatar stays hidden until the first arrow
  // key press, rather than flashing on screen before anyone's touched a key.
  const lastActiveElapsedRef = useRef(-Infinity);
  // id of the chair currently being sat in, or null while walking around.
  const sittingChairIdRef = useRef(null);
  // Requires every arrow key to be let go at least once before a held key
  // can stand the person back up — without this, holding a key while
  // arriving at a chair would sit/stand/re-sit every single frame (the
  // chair keeps re-triggering as soon as they stand since chairs don't
  // block movement), pinning them in place instead of letting them pass
  // through or settle.
  const releasedSinceSittingRef = useRef(true);

  // Stairs are climbable (not solid), chairs trigger sitting instead of
  // blocking, and everything else (furniture, trees, doors, products,
  // partition walls, ...) is a solid obstacle the person walks around.
  const { stairsObjects, chairObjects, blockingObjects } = useMemo(() => {
    const stairs = [];
    const chairs = [];
    const blocking = [];
    floorObjects.forEach((object) => {
      if (object.kind === 'facility' && object.category === 'stairs') stairs.push(object);
      else if (object.kind === 'facility' && object.category === 'chair') chairs.push(object);
      else blocking.push(object);
    });
    return { stairsObjects: stairs, chairObjects: chairs, blockingObjects: blocking };
  }, [floorObjects]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // guard against huge jumps after a tab was backgrounded
    const keys = keysHeldRef.current;
    let dx = 0;
    let dz = 0;
    if (keys.has('ArrowUp')) dz -= 1;
    if (keys.has('ArrowDown')) dz += 1;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    const wantsToMove = dx !== 0 || dz !== 0;

    if (keys.size === 0) releasedSinceSittingRef.current = true;

    const isSitting = sittingChairIdRef.current !== null;
    if (isSitting && wantsToMove && releasedSinceSittingRef.current) {
      sittingChairIdRef.current = null; // let go and pressed again — stand up
    }

    if (wantsToMove && sittingChairIdRef.current === null) {
      lastActiveElapsedRef.current = state.clock.elapsedTime;

      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      const step = WALK_SPEED_M_S * delta;
      const halfW = footprint.widthM / 2 - PERSON_RADIUS_M;
      const halfD = footprint.depthM / 2 - PERSON_RADIUS_M;

      // Resolve x and z separately so walking diagonally into a wall slides
      // along it instead of just stopping dead.
      const nextX = clamp(posRef.current.x + dx * step, -halfW, halfW);
      if (!collidesWithAny(nextX, posRef.current.z, blockingObjects, footprint)) {
        posRef.current.x = nextX;
      }
      const nextZ = clamp(posRef.current.z + dz * step, -halfD, halfD);
      if (!collidesWithAny(posRef.current.x, nextZ, blockingObjects, footprint)) {
        posRef.current.z = nextZ;
      }
      headingRef.current = Math.atan2(dx, dz);

      for (const chair of chairObjects) {
        const local = worldToObjectLocal(posRef.current.x, posRef.current.z, chair, footprint);
        if (isInsideObjectFootprint(local, chair, PERSON_RADIUS_M)) {
          sittingChairIdRef.current = chair.id;
          releasedSinceSittingRef.current = false;
          posRef.current.x = chair.x - footprint.widthM / 2;
          posRef.current.z = chair.y - footprint.depthM / 2;
          headingRef.current = -THREE.MathUtils.degToRad(chair.rotation || 0);
          break;
        }
      }
    } else if (wantsToMove) {
      // Still sitting (key held through the sit trigger, not released yet) —
      // keep the avatar counted as "active" so the idle-hide timer doesn't
      // fire, but don't move.
      lastActiveElapsedRef.current = state.clock.elapsedTime;
    }

    let targetHeight = 0;
    const sittingChair = sittingChairIdRef.current
      ? chairObjects.find((c) => c.id === sittingChairIdRef.current)
      : null;
    if (sittingChair) {
      const chairHeightM = Math.max(0.05, (sittingChair.verticalHeightMm || 800) / 1000);
      const chairElevationM = Math.max(0, sittingChair.elevationMm || 0) / 1000;
      targetHeight = chairElevationM + chairHeightM * CHAIR_SEAT_HEIGHT_RATIO;
    } else {
      for (const stair of stairsObjects) {
        const local = worldToObjectLocal(posRef.current.x, posRef.current.z, stair, footprint);
        if (isInsideObjectFootprint(local, stair, 0)) {
          const climbRatio = clamp((local.z + stair.height / 2) / stair.height, 0, 1);
          const stairHeightM = Math.max(0.05, (stair.verticalHeightMm || 800) / 1000);
          const stairElevationM = Math.max(0, stair.elevationMm || 0) / 1000;
          targetHeight = stairElevationM + climbRatio * stairHeightM;
          break;
        }
      }
    }
    heightRef.current = targetHeight;

    const group = groupRef.current;
    if (group) {
      const idle = state.clock.elapsedTime - lastActiveElapsedRef.current >= PERSON_HIDE_DELAY_S;
      group.visible = Boolean(sittingChair) || !idle;
      group.position.set(posRef.current.x, heightRef.current, posRef.current.z);
      group.rotation.y = headingRef.current;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* legs */}
      <mesh position={[-0.08, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color="#1E3A8A" />
      </mesh>
      <mesh position={[0.08, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color="#1E3A8A" />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 0.18]} />
        <meshStandardMaterial color="#2563EB" />
      </mesh>
      {/* arms */}
      <mesh position={[-0.22, 0.71, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.38, 8]} />
        <meshStandardMaterial color="#2563EB" />
      </mesh>
      <mesh position={[0.22, 0.71, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.38, 8]} />
        <meshStandardMaterial color="#2563EB" />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.04, 0]} castShadow>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      {/* facing indicator */}
      <mesh position={[0, 1.04, 0.14]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function Scene({ footprint, floorObjects, floorHeightM, keysHeldRef }) {
  const maxDim = Math.max(footprint.widthM, footprint.depthM);
  const camDist = maxDim * 1.3 + 4;

  return (
    <>
      <PerspectiveCamera makeDefault position={[camDist, camDist * 0.75, camDist]} fov={45} />
      <OrbitControls
        target={[0, floorHeightM / 3, 0]}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={2}
        maxDistance={camDist * 3}
        enableDamping
        dampingFactor={0.08}
      />
      <ambientLight intensity={0.7} />
      <directionalLight position={[maxDim, maxDim * 1.5, maxDim]} intensity={0.9} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[footprint.widthM, footprint.depthM]} />
        <meshStandardMaterial color={FLOOR_COLOR} side={THREE.DoubleSide} />
      </mesh>
      <gridHelper args={[maxDim * 1.6, 24, '#a5b4fc', '#e5e7eb']} position={[0, 0.001, 0]} />

      <Walls footprint={footprint} heightM={floorHeightM} />

      {floorObjects.map((object) => (
        <Suspense key={object.id} fallback={null}>
          <PlacedObject3D object={object} footprint={footprint} />
        </Suspense>
      ))}

      <Person footprint={footprint} floorObjects={floorObjects} keysHeldRef={keysHeldRef} />
    </>
  );
}

export function Design3DView() {
  const building = useAppStore((s) => s.building);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const objects = useAppStore((s) => s.objects);
  const keysHeldRef = useRef(new Set());

  const floorObjects = useMemo(
    () => objects.filter((o) => o.floorId === activeFloorId),
    [objects, activeFloorId]
  );

  const floorHeightM = useMemo(() => {
    if (!building?.heightM || !building?.floorCount) return DEFAULT_FLOOR_HEIGHT_M;
    return Math.max(MIN_FLOOR_HEIGHT_M, building.heightM / building.floorCount);
  }, [building]);

  // Arrow keys walk the person around the layout while this view is open.
  // preventDefault stops them from also scrolling the page.
  useEffect(() => {
    function handleKeyDown(e) {
      if (!ARROW_KEYS.has(e.key)) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      keysHeldRef.current.add(e.key);
    }
    function handleKeyUp(e) {
      keysHeldRef.current.delete(e.key);
    }
    function reset() {
      keysHeldRef.current.clear();
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', reset);
      reset();
    };
  }, []);

  if (!building) return null;

  return (
    <div className="design-3d-view">
      <Canvas dpr={[1, 2]}>
        <color attach="background" args={['#e5e7eb']} />
        <Scene
          footprint={building.footprint}
          floorObjects={floorObjects}
          floorHeightM={floorHeightM}
          keysHeldRef={keysHeldRef}
        />
      </Canvas>
    </div>
  );
}
