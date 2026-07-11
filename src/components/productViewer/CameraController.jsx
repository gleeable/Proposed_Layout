import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useViewerStore } from './ViewerContext';
import { getFitDistance, getViewDirection } from './viewerPresets';

const LERP_HALF_LIFE = 0.12;

export function CameraController({ controlsRef }) {
  const { camera } = useThree();
  const activeView = useViewerStore((s) => s.activeView);
  const bounds = useViewerStore((s) => s.bounds);

  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useEffect(() => {
    if (!bounds) return;
    const { center, radius } = bounds;
    const distance = getFitDistance(camera, radius);
    const viewKey = activeView === 'free' ? 'iso' : activeView;
    const dir = getViewDirection(viewKey);

    targetPos.current.copy(center).addScaledVector(dir, distance);
    targetLookAt.current.copy(center);

    if (!initialized.current) {
      camera.position.copy(targetPos.current);
      camera.lookAt(targetLookAt.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
      initialized.current = true;
    }
  }, [activeView, bounds, camera, controlsRef]);

  useFrame((_, delta) => {
    if (!bounds) return;
    const controls = controlsRef.current;

    if (activeView !== 'free') {
      const t = 1 - Math.pow(2, -delta / LERP_HALF_LIFE);
      camera.position.lerp(targetPos.current, t);
      if (controls) controls.target.lerp(targetLookAt.current, t);
    } else if (controls) {
      const dist = controls.target.distanceTo(bounds.center);
      const maxPan = bounds.radius * 2.2;
      if (dist > maxPan) controls.target.lerp(bounds.center, 0.08);
    }

    controls?.update();
  });

  return null;
}
