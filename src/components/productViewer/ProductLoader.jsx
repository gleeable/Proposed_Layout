import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, useGLTF, useTexture } from '@react-three/drei';

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

function BillboardProduct({ imageUrl, width, depth, height, onBoundsReady }) {
  const texture = useTexture(imageUrl);
  const planeWidth = Math.max(width, depth, 0.3);
  const planeHeight = Math.max(height, 0.3);

  useEffect(() => {
    const radius = Math.max(Math.sqrt(planeWidth ** 2 + planeHeight ** 2) / 2, 0.3);
    onBoundsReady({ center: new THREE.Vector3(0, planeHeight / 2, 0), radius });
  }, [planeWidth, planeHeight, onBoundsReady]);

  return (
    <Billboard position={[0, planeHeight / 2, 0]}>
      <mesh castShadow>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </Billboard>
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
        <BillboardProduct
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
