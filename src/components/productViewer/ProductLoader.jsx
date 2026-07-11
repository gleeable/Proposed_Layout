import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, useTexture } from '@react-three/drei';

function GltfProduct({ modelUrl, width, depth, height, onBoundsReady }) {
  const { scene } = useGLTF(modelUrl);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const { scale, offset, center, radius } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const boxCenter = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(boxCenter);
    const candidates = [
      size.x > 0 ? width / size.x : null,
      size.z > 0 ? depth / size.z : null,
      size.y > 0 ? height / size.y : null,
    ].filter((v) => Number.isFinite(v) && v > 0);
    const s = candidates.length ? Math.min(...candidates) : 1;
    return {
      scale: s,
      offset: new THREE.Vector3(-boxCenter.x * s, -box.min.y * s, -boxCenter.z * s),
      center: new THREE.Vector3(0, (size.y * s) / 2, 0),
      radius: Math.max((size.length() * s) / 2, 0.2),
    };
  }, [cloned, width, depth, height]);

  useEffect(() => {
    onBoundsReady({ center, radius });
  }, [center, radius, onBoundsReady]);

  return <primitive object={cloned} scale={scale} position={[offset.x, offset.y, offset.z]} />;
}

// A product photo has no real "back" — this fakes one by wrapping the same
// photo around all four side faces of a box (BoxGeometry material order is
// [+x, -x, +y, -y, +z, -z], so indices 0/1/4/5 are the four sides and 2/3
// are the top/bottom caps). Unlike the old Billboard, this mesh is fixed in
// space: orbiting the camera around it actually shows every side instead of
// the image continuously rotating to face you.
function TexturedBoxProduct({ imageUrl, width, depth, height, onBoundsReady }) {
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

  useEffect(() => {
    const radius = Math.max(new THREE.Vector3(w, h, d).length() / 2, 0.3);
    onBoundsReady({ center: new THREE.Vector3(0, h / 2, 0), radius });
  }, [w, h, d, onBoundsReady]);

  return (
    <mesh position={[0, h / 2, 0]} material={materials} castShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

function BoxProduct({ width, depth, height, fill, onBoundsReady }) {
  const h = Math.max(height, 0.1);

  useEffect(() => {
    const radius = Math.max(new THREE.Vector3(width, h, depth).length() / 2, 0.3);
    onBoundsReady({ center: new THREE.Vector3(0, h / 2, 0), radius });
  }, [width, h, depth, onBoundsReady]);

  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, h, depth]} />
      <meshStandardMaterial color={fill || '#93c5fd'} roughness={0.6} metalness={0.05} />
    </mesh>
  );
}

export function ProductLoader({ product, onBoundsReady }) {
  const width = Math.max(product.width || 1, 0.05);
  const depth = Math.max(product.height || 1, 0.05);
  const heightM = Math.max((product.verticalHeightMm || 800) / 1000, 0.05);

  if (product.modelUrl) {
    return (
      <Suspense
        fallback={
          <BoxProduct width={width} depth={depth} height={heightM} fill={product.fill} onBoundsReady={onBoundsReady} />
        }
      >
        <GltfProduct
          modelUrl={product.modelUrl}
          width={width}
          depth={depth}
          height={heightM}
          onBoundsReady={onBoundsReady}
        />
      </Suspense>
    );
  }

  if (product.imageDataUrl) {
    return (
      <Suspense fallback={null}>
        <TexturedBoxProduct
          imageUrl={product.imageDataUrl}
          width={width}
          depth={depth}
          height={heightM}
          onBoundsReady={onBoundsReady}
        />
      </Suspense>
    );
  }

  return (
    <BoxProduct width={width} depth={depth} height={heightM} fill={product.fill} onBoundsReady={onBoundsReady} />
  );
}
