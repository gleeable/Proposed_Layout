import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Billboard, Html, OrbitControls, PerspectiveCamera, useGLTF, useTexture } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import './Design3DView.css';

const DEFAULT_FLOOR_HEIGHT_M = 3;
const MIN_FLOOR_HEIGHT_M = 2.2;
const WALL_THICKNESS_M = 0.15;
const WALL_COLOR = '#c7d2fe';
const FLOOR_COLOR = '#f3f4f6';

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

function ProductStandee({ width, depth, height, imageUrl }) {
  const texture = useTexture(imageUrl);
  const planeWidth = Math.max(width, depth, 0.3);
  return (
    <Billboard position={[0, height / 2, 0]}>
      <mesh>
        <planeGeometry args={[planeWidth, height]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </Billboard>
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

function PlacedObject3D({ object, footprint }) {
  const width = Math.max(0.05, object.width);
  const depth = Math.max(0.05, object.height);
  const heightM = Math.max(0.05, (object.verticalHeightMm || 800) / 1000);
  const elevationM = Math.max(0, object.elevationMm || 0) / 1000;
  const x = object.x - footprint.widthM / 2;
  const z = object.y - footprint.depthM / 2;
  const rotY = -THREE.MathUtils.degToRad(object.rotation || 0);
  const showLabel = object.kind !== 'product';

  return (
    <group position={[x, elevationM, z]} rotation={[0, rotY, 0]}>
      {object.modelUrl ? (
        <ProductModel3D width={width} depth={depth} height={heightM} modelUrl={object.modelUrl} />
      ) : object.imageDataUrl ? (
        <ProductStandee width={width} depth={depth} height={heightM} imageUrl={object.imageDataUrl} />
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

function Scene({ footprint, floorObjects, floorHeightM }) {
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
    </>
  );
}

export function Design3DView() {
  const building = useAppStore((s) => s.building);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const objects = useAppStore((s) => s.objects);

  const floorObjects = useMemo(
    () => objects.filter((o) => o.floorId === activeFloorId),
    [objects, activeFloorId]
  );

  const floorHeightM = useMemo(() => {
    if (!building?.heightM || !building?.floorCount) return DEFAULT_FLOOR_HEIGHT_M;
    return Math.max(MIN_FLOOR_HEIGHT_M, building.heightM / building.floorCount);
  }, [building]);

  if (!building) return null;

  return (
    <div className="design-3d-view">
      <Canvas dpr={[1, 2]}>
        <color attach="background" args={['#e5e7eb']} />
        <Scene footprint={building.footprint} floorObjects={floorObjects} floorHeightM={floorHeightM} />
      </Canvas>
    </div>
  );
}
