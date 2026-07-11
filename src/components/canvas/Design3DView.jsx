import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF, useTexture } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import './Design3DView.css';

const DEFAULT_FLOOR_HEIGHT_M = 3;
const MIN_FLOOR_HEIGHT_M = 2.2;
const WALL_THICKNESS_M = 0.15;
const WALL_COLOR = '#c7d2fe';
const FLOOR_COLOR = '#f3f4f6';
const WALK_SPEED_M_S = 1.4; // an average adult walking pace
const PERSON_RADIUS_M = 0.25; // keeps the avatar from walking through walls

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const SHAPED_3D_CATEGORIES = new Set(['stairs', 'tree', 'table', 'chair', 'door']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

// A product photo has no real "back" — this fakes one by wrapping the same
// photo around all four side faces of a box (BoxGeometry material order is
// [+x, -x, +y, -y, +z, -z], so indices 0/1/4/5 are the four sides and 2/3
// are the top/bottom caps). The box is a normal fixed-in-space mesh, not a
// camera-facing billboard, so orbiting around it actually shows every side
// instead of the image spinning to follow you.
function ProductBox({ width, depth, height, imageUrl }) {
  const texture = useTexture(imageUrl);
  const w = Math.max(width, 0.1);
  const d = Math.max(depth, 0.1);
  const h = Math.max(height, 0.1);

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
    });
    const cap = new THREE.MeshStandardMaterial({ color: '#e5e7eb' });
    return [side, side, cap, cap, side, side];
  }, [texture]);

  return (
    <mesh position={[0, h / 2, 0]} material={materials}>
      <boxGeometry args={[w, h, d]} />
    </mesh>
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
  const showLabel = object.kind !== 'product';
  const isShapedFacility = object.kind === 'facility' && SHAPED_3D_CATEGORIES.has(object.category);

  return (
    <group position={[x, elevationM, z]} rotation={[0, rotY, 0]}>
      {object.modelUrl ? (
        <ProductModel3D width={width} depth={depth} height={heightM} modelUrl={object.modelUrl} />
      ) : object.imageDataUrl ? (
        <ProductBox width={width} depth={depth} height={heightM} imageUrl={object.imageDataUrl} />
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
function Person({ footprint, keysHeldRef }) {
  const groupRef = useRef(null);
  const posRef = useRef({ x: 0, z: 0 });
  const headingRef = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1); // guard against huge jumps after a tab was backgrounded
    const keys = keysHeldRef.current;
    let dx = 0;
    let dz = 0;
    if (keys.has('ArrowUp')) dz -= 1;
    if (keys.has('ArrowDown')) dz += 1;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      const step = WALK_SPEED_M_S * delta;
      const halfW = footprint.widthM / 2 - PERSON_RADIUS_M;
      const halfD = footprint.depthM / 2 - PERSON_RADIUS_M;
      posRef.current.x = clamp(posRef.current.x + dx * step, -halfW, halfW);
      posRef.current.z = clamp(posRef.current.z + dz * step, -halfD, halfD);
      headingRef.current = Math.atan2(dx, dz);
    }

    const group = groupRef.current;
    if (group) {
      group.position.set(posRef.current.x, 0, posRef.current.z);
      group.rotation.y = headingRef.current;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.55, 4, 8]} />
        <meshStandardMaterial color="#2563EB" />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.15, 14, 14]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      <mesh position={[0, 1.02, 0.15]}>
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

      <Person footprint={footprint} keysHeldRef={keysHeldRef} />
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
