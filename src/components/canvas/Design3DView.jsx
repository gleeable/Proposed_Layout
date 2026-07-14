import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { resolveMaterialImage } from '../../services/materialResolve';
import { PRODUCT_ARCHETYPE_BY_CATEGORY, inferProductShapeCategory } from '../../domain/productShapeCatalog';
import {
  PlainBox,
  StairsShape3D,
  TreeShape3D,
  TableShape3D,
  ChairShape3D,
  DoorShape3D,
  WindowShape3D,
  BedShape3D,
  BlanketShape3D,
  PillowShape3D,
  ARCHETYPE_COMPONENTS,
} from './productShapeArchetypes3D';
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
const EYE_HEIGHT_M = 1.6; // first-person camera height above the ground/stair/chair level (160cm)
const DEFAULT_FOV = 45;
const MIN_FOV = 20; // most zoomed in
const MAX_FOV = 75; // most zoomed out
const FOV_WHEEL_SENSITIVITY = 0.04; // degrees of fov per pixel of wheel delta
const LOOK_SENSITIVITY = 0.0035; // radians of yaw/pitch per pixel of mouse drag
const MAX_PITCH = Math.PI / 2 - 0.05; // just short of straight up/down
const CLICK_WALK_ARRIVE_M = 0.15; // close enough to a clicked floor point to stop
const CLICK_DRAG_THRESHOLD_PX = 6; // pointer movement below this counts as a click, not a look-drag

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const SHAPED_3D_CATEGORIES = new Set([
  'stairs', 'tree', 'table', 'chair', 'door', 'window', 'bed', 'blanket', 'pillow',
]);

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

// Loads a material swatch (built-in procedural PNG or a user-requested photo)
// as a repeating THREE texture. Manual TextureLoader + effect (matching
// useAverageColor's style above) rather than drei's useTexture, since the
// source image can be null/changing and we don't want to wrap walls/floor in
// Suspense just for this.
function useSurfaceTexture(imageDataUrl, repeatX, repeatY) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!imageDataUrl) {
      setTexture(null);
      return undefined;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(imageDataUrl, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [imageDataUrl]);

  useEffect(() => {
    if (!texture) return;
    texture.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY));
    texture.needsUpdate = true;
  }, [texture, repeatX, repeatY]);

  return texture;
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

// Without a chosen wallpaper/tile finish, walls stay the original
// translucent placeholder (so you can still see inside from outside). Once a
// material is applied, they render as opaque finished walls with that
// texture — a plain tinted-glass look would make no sense for a "finish".
function WallMaterial({ texture }) {
  // Every prop is set explicitly on every render (never omitted) — R3F's
  // applyProps only sets props present in the current render and leaves
  // previously-set ones untouched, so switching between "has texture" and
  // "no texture" by omitting transparent/opacity/color between renders would
  // leave the untextured material's stale 0.4 opacity stuck on the same
  // underlying THREE.Material instance once a texture arrives.
  //
  // toneMapped={false} once textured: the scene's light intensities push
  // R3F's default ACES tone-mapping curve hard enough that a moderately
  // dark/saturated swatch (navy, charcoal, ...) gets crushed to near-neutral
  // gray by the time it reaches the screen — verified by A/B testing against
  // meshBasicMaterial, which isn't tone-mapped and showed the true hue fine.
  // Bypassing tone-mapping for the textured material shows the swatch's
  // actual color instead. The untextured placeholder is left tone-mapped
  // since it's pale enough (#c7d2fe) that the curve barely affects it, and
  // it should still respond to scene lighting like everything else.
  return (
    <meshStandardMaterial
      map={texture || null}
      color={texture ? '#ffffff' : WALL_COLOR}
      transparent={!texture}
      opacity={texture ? 1 : 0.4}
      side={THREE.DoubleSide}
      toneMapped={!texture}
    />
  );
}

function Walls({ footprint, heightM, materialImage }) {
  const wallY = heightM / 2;
  const textureNS = useSurfaceTexture(materialImage, footprint.widthM, heightM);
  const textureEW = useSurfaceTexture(materialImage, footprint.depthM, heightM);
  return (
    <group>
      <mesh position={[0, wallY, -footprint.depthM / 2]}>
        <boxGeometry args={[footprint.widthM + WALL_THICKNESS_M, heightM, WALL_THICKNESS_M]} />
        <WallMaterial texture={textureNS} />
      </mesh>
      <mesh position={[0, wallY, footprint.depthM / 2]}>
        <boxGeometry args={[footprint.widthM + WALL_THICKNESS_M, heightM, WALL_THICKNESS_M]} />
        <WallMaterial texture={textureNS} />
      </mesh>
      <mesh position={[-footprint.widthM / 2, wallY, 0]}>
        <boxGeometry args={[WALL_THICKNESS_M, heightM, footprint.depthM + WALL_THICKNESS_M]} />
        <WallMaterial texture={textureEW} />
      </mesh>
      <mesh position={[footprint.widthM / 2, wallY, 0]}>
        <boxGeometry args={[WALL_THICKNESS_M, heightM, footprint.depthM + WALL_THICKNESS_M]} />
        <WallMaterial texture={textureEW} />
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

// Two-step lookup: category (one of the ~200 ids in productShapeCatalog.js,
// set by Gemini classification or the keyword fallback) -> archetype name ->
// the archetype's parametric shape component. Falls back to PlainBox only
// for the 'box' escape hatch or an unrecognized/legacy category.
function ProductShape3D({ category, width, depth, height, fill }) {
  const archetype = PRODUCT_ARCHETYPE_BY_CATEGORY[category];
  const Component = archetype ? ARCHETYPE_COMPONENTS[archetype] : null;
  if (!Component) return <PlainBox width={width} depth={depth} height={height} fill={fill} />;
  return <Component width={width} depth={depth} height={height} fill={fill} />;
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
    case 'window':
      return <WindowShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'bed':
      return <BedShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'blanket':
      return <BlanketShape3D width={width} depth={depth} height={height} fill={fill} />;
    case 'pillow':
      return <PillowShape3D width={width} depth={depth} height={height} fill={fill} />;
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
  // Off by default (F7-style opt-in) — the 2D object detail modal's "3D에
  // 이름 표시하기" checkbox controls this per object.
  const showLabel = Boolean(object.showLabelIn3D);
  const isShapedFacility = object.kind === 'facility' && SHAPED_3D_CATEGORIES.has(object.category);
  const isShapedProduct = object.kind === 'product' && !object.modelUrl;
  // Gemini classifies the product name at registration time (more reliable
  // than the keyword list below); fall back to keyword matching for
  // products saved before that existed, when classification failed, or when
  // it landed on the generic "box" fallback — newer keyword categories
  // (bed/pillow/hairdryer) didn't exist yet when older items were classified.
  const productCategory = isShapedProduct
    ? ((object.shapeCategory && object.shapeCategory !== 'box') ? object.shapeCategory : inferProductShapeCategory(object.label))
    : null;
  const averageColor = useAverageColor(isShapedProduct ? object.imageDataUrl : null);
  // A color picked explicitly in the object detail modal always wins over
  // the auto-sampled photo color, which in turn beats the plain default.
  const resolvedFill = object.fill || averageColor || '#93C5FD';

  return (
    <group position={[x, elevationM, z]} rotation={[0, rotY, 0]}>
      {object.modelUrl ? (
        <ProductModel3D width={width} depth={depth} height={heightM} modelUrl={object.modelUrl} />
      ) : isShapedProduct ? (
        <ProductShape3D category={productCategory} width={width} depth={depth} height={heightM} fill={resolvedFill} />
      ) : isShapedFacility ? (
        <FacilityShape3D category={object.category} width={width} depth={depth} height={heightM} fill={resolvedFill} />
      ) : (
        <PlainBox width={width} depth={depth} height={heightM} fill={resolvedFill} />
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
function Person({ footprint, floorObjects, keysHeldRef, isFirstPersonMode, walkerRef, viewYawRef, mouseTargetRef }) {
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

  // Hands the position/height/heading refs up to the parent so a sibling
  // (FirstPersonRig) can drive the camera from the exact same walk state
  // instead of duplicating the movement simulation.
  if (walkerRef) walkerRef.current = { posRef, heightRef, headingRef };

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
    const upInput = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
    const rightInput = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    let dx;
    let dz;
    if (isFirstPersonMode && viewYawRef) {
      // Move relative to where the mouse is currently looking, not fixed
      // world axes — forward/right vectors derived from the same yaw
      // FirstPersonRig points the camera at (see its "+ Math.PI" comment).
      const yaw = viewYawRef.current;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      dx = forwardX * upInput + rightX * rightInput;
      dz = forwardZ * upInput + rightZ * rightInput;
    } else {
      dx = rightInput;
      dz = -upInput;
    }
    let wantsToMove = dx !== 0 || dz !== 0;

    // Clicking the floor in first-person mode walks straight to that point
    // instead of requiring the arrow keys — but arrow keys always win if
    // pressed, cancelling any pending click-to-walk target.
    if (mouseTargetRef) {
      if (wantsToMove) {
        mouseTargetRef.current = null;
      } else if (mouseTargetRef.current) {
        const toTargetX = mouseTargetRef.current.x - posRef.current.x;
        const toTargetZ = mouseTargetRef.current.z - posRef.current.z;
        const targetDist = Math.hypot(toTargetX, toTargetZ);
        if (targetDist < CLICK_WALK_ARRIVE_M) {
          mouseTargetRef.current = null;
        } else {
          dx = toTargetX / targetDist;
          dz = toTargetZ / targetDist;
          wantsToMove = true;
        }
      }
    }

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
      // along it instead of just stopping dead. First-person mode skips
      // object collision entirely (noclip through furniture/products) —
      // only the building's outer footprint (the clamp above) still holds.
      const nextX = clamp(posRef.current.x + dx * step, -halfW, halfW);
      if (isFirstPersonMode || !collidesWithAny(nextX, posRef.current.z, blockingObjects, footprint)) {
        posRef.current.x = nextX;
      }
      const nextZ = clamp(posRef.current.z + dz * step, -halfD, halfD);
      if (isFirstPersonMode || !collidesWithAny(posRef.current.x, nextZ, blockingObjects, footprint)) {
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
      // Never show the 3rd-person body in first-person mode — the camera
      // sits right where the head would be, so the doll would just clip
      // around the view instead of being seen from outside.
      group.visible = !isFirstPersonMode && (Boolean(sittingChair) || !idle);
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

// How many real-world meters one swatch tile covers on the floor. Bigger
// than 1 (the walls' scale) so a large floor isn't visibly chopped into a
// dense grid of small repeats — combined with the now-seamless patterns in
// materialTexture.js, this reads as one continuous floor rather than tiles.
const FLOOR_TILE_SIZE_M = 2;

function Floor({ footprint, materialImage, isFirstPersonMode, onGroundClick }) {
  const texture = useSurfaceTexture(materialImage, footprint.widthM / FLOOR_TILE_SIZE_M, footprint.depthM / FLOOR_TILE_SIZE_M);
  const pointerDownRef = useRef(null);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        if (!isFirstPersonMode) return;
        pointerDownRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!isFirstPersonMode || !pointerDownRef.current) return;
        const dist = Math.hypot(e.clientX - pointerDownRef.current.x, e.clientY - pointerDownRef.current.y);
        pointerDownRef.current = null;
        // A small drag is still a look-drag (see the canvas-level pointer
        // handlers below), not a click-to-walk command.
        if (dist < CLICK_DRAG_THRESHOLD_PX) {
          onGroundClick?.(e.point.x, e.point.z);
        }
      }}
    >
      <planeGeometry args={[footprint.widthM, footprint.depthM]} />
      {/* Same explicit-every-prop + toneMapped reasoning as WallMaterial above. */}
      <meshStandardMaterial
        map={texture || null}
        color={texture ? '#ffffff' : FLOOR_COLOR}
        side={THREE.DoubleSide}
        toneMapped={!texture}
      />
    </mesh>
  );
}

// Drives the camera directly from the walker's position/height/heading refs
// (shared with Person, see walkerRef above) while first-person mode is on —
// eye height is a fixed 160cm above whatever ground/stair/chair level the
// walker is standing at. Camera forward is -Z by convention (Person's doll
// forward is +Z), hence the extra Math.PI so the view faces the walking
// direction instead of its back.
function FirstPersonRig({ walkerRef, viewYawRef, viewPitchRef, fovRef, active }) {
  useFrame((state) => {
    if (!active || !walkerRef.current) return;
    const { posRef, heightRef } = walkerRef.current;
    state.camera.position.set(posRef.current.x, heightRef.current + EYE_HEIGHT_M, posRef.current.z);
    // 'YXZ' (yaw applied before pitch) is the standard order for a
    // mouse-look camera — 'XYZ' would fold pitch and yaw together and make
    // the horizon tilt as soon as you look up/down while turning.
    state.camera.rotation.order = 'YXZ';
    state.camera.rotation.set(viewPitchRef.current, viewYawRef.current, 0);
    if (state.camera.fov !== fovRef.current) {
      state.camera.fov = fovRef.current;
      state.camera.updateProjectionMatrix();
    }
  });
  return null;
}

function Scene({
  footprint, floorObjects, floorHeightM, keysHeldRef, wallMaterialImage, floorMaterialImage,
  isFirstPersonMode, walkerRef, viewYawRef, viewPitchRef, fovRef, mouseTargetRef,
}) {
  const maxDim = Math.max(footprint.widthM, footprint.depthM);
  const camDist = maxDim * 1.3 + 4;

  return (
    <>
      <PerspectiveCamera makeDefault position={[camDist, camDist * 0.75, camDist]} fov={45} />
      {isFirstPersonMode ? (
        <FirstPersonRig
          walkerRef={walkerRef}
          viewYawRef={viewYawRef}
          viewPitchRef={viewPitchRef}
          fovRef={fovRef}
          active={isFirstPersonMode}
        />
      ) : (
        <OrbitControls
          target={[0, floorHeightM / 3, 0]}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={2}
          maxDistance={camDist * 3}
          enableDamping
          dampingFactor={0.08}
        />
      )}
      <ambientLight intensity={0.7} />
      <directionalLight position={[maxDim, maxDim * 1.5, maxDim]} intensity={0.9} />

      <Floor
        footprint={footprint}
        materialImage={floorMaterialImage}
        isFirstPersonMode={isFirstPersonMode}
        onGroundClick={(x, z) => {
          if (mouseTargetRef) mouseTargetRef.current = { x, z };
        }}
      />
      <gridHelper args={[maxDim * 1.6, 24, '#a5b4fc', '#e5e7eb']} position={[0, 0.001, 0]} />

      <Walls footprint={footprint} heightM={floorHeightM} materialImage={wallMaterialImage} />

      {floorObjects.map((object) => (
        <Suspense key={object.id} fallback={null}>
          <PlacedObject3D object={object} footprint={footprint} />
        </Suspense>
      ))}

      <Person
        footprint={footprint}
        floorObjects={floorObjects}
        keysHeldRef={keysHeldRef}
        isFirstPersonMode={isFirstPersonMode}
        walkerRef={walkerRef}
        viewYawRef={viewYawRef}
        mouseTargetRef={mouseTargetRef}
      />
    </>
  );
}

export const Design3DView = forwardRef(function Design3DView(props, ref) {
  const building = useAppStore((s) => s.building);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const objects = useAppStore((s) => s.objects);
  const wallMaterialId = useAppStore((s) => s.wallMaterialId);
  const floorMaterialId = useAppStore((s) => s.floorMaterialId);
  const customMaterials = useAppStore((s) => s.customMaterials);
  const isFirstPersonMode = useAppStore((s) => s.isFirstPersonMode);
  const keysHeldRef = useRef(new Set());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  // Shared with Person/FirstPersonRig — see their comments for why these
  // live up here instead of inside Scene.
  const walkerRef = useRef(null);
  const viewYawRef = useRef(0);
  const viewPitchRef = useRef(0);
  const fovRef = useRef(DEFAULT_FOV);
  const dragRef = useRef(null); // { x, y } of the last pointer position while dragging, or null
  const mouseTargetRef = useRef(null); // { x, z } walk-to point from clicking the floor, or null

  const wallMaterialImage = useMemo(
    () => resolveMaterialImage(wallMaterialId, customMaterials),
    [wallMaterialId, customMaterials]
  );
  const floorMaterialImage = useMemo(
    () => resolveMaterialImage(floorMaterialId, customMaterials),
    [floorMaterialId, customMaterials]
  );

  // Lets callers outside this view (e.g. the "PDF로 저장" button) grab a
  // still image of whatever the 3D canvas is currently showing.
  useImperativeHandle(ref, () => ({
    captureImage: () => rendererRef.current?.domElement.toDataURL('image/png') ?? null,
  }));

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

  // Entering first-person: start the view facing the same way the 3rd-person
  // avatar last faced, so the switch doesn't snap to some unrelated
  // direction. Leaving it: hand the camera's fov back to its default so the
  // orbit view isn't left however zoomed the walkthrough was.
  const wasFirstPersonRef = useRef(false);
  useEffect(() => {
    if (isFirstPersonMode && !wasFirstPersonRef.current) {
      const heading = walkerRef.current?.headingRef.current ?? 0;
      viewYawRef.current = heading + Math.PI;
      viewPitchRef.current = 0;
      fovRef.current = DEFAULT_FOV;
    } else if (!isFirstPersonMode && wasFirstPersonRef.current) {
      fovRef.current = DEFAULT_FOV;
      dragRef.current = null;
      mouseTargetRef.current = null;
      const camera = cameraRef.current;
      if (camera) {
        camera.fov = DEFAULT_FOV;
        camera.updateProjectionMatrix();
      }
    }
    wasFirstPersonRef.current = isFirstPersonMode;
  }, [isFirstPersonMode]);

  if (!building) return null;

  return (
    <div className="design-3d-view">
      <Canvas
        dpr={[1, 2]}
        // preserveDrawingBuffer keeps the last rendered frame in the WebGL
        // buffer so captureImage()'s toDataURL() isn't reading a blank/
        // cleared canvas (the default behavior right after a paint).
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl, camera }) => {
          rendererRef.current = gl;
          cameraRef.current = camera;
        }}
        onPointerDown={(e) => {
          if (!isFirstPersonMode) return;
          dragRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!isFirstPersonMode || !dragRef.current) return;
          const dx = e.clientX - dragRef.current.x;
          const dy = e.clientY - dragRef.current.y;
          dragRef.current = { x: e.clientX, y: e.clientY };
          viewYawRef.current -= dx * LOOK_SENSITIVITY;
          viewPitchRef.current = clamp(viewPitchRef.current - dy * LOOK_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
        onWheel={(e) => {
          if (!isFirstPersonMode) return;
          e.preventDefault();
          fovRef.current = clamp(fovRef.current + e.deltaY * FOV_WHEEL_SENSITIVITY, MIN_FOV, MAX_FOV);
        }}
      >
        <color attach="background" args={['#e5e7eb']} />
        <Scene
          footprint={building.footprint}
          floorObjects={floorObjects}
          floorHeightM={floorHeightM}
          keysHeldRef={keysHeldRef}
          wallMaterialImage={wallMaterialImage}
          floorMaterialImage={floorMaterialImage}
          isFirstPersonMode={isFirstPersonMode}
          walkerRef={walkerRef}
          viewYawRef={viewYawRef}
          viewPitchRef={viewPitchRef}
          fovRef={fovRef}
          mouseTargetRef={mouseTargetRef}
        />
      </Canvas>
    </div>
  );
});
