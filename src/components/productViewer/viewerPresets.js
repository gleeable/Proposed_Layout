import * as THREE from 'three';

const EPS = 0.0001;

export const VIEW_BUTTONS = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'iso', label: 'Iso' },
  { key: 'perspective', label: 'Perspective' },
];

const VIEW_DIRECTIONS = {
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(EPS, 1, EPS).normalize(),
  bottom: new THREE.Vector3(EPS, -1, EPS).normalize(),
  iso: new THREE.Vector3(1, 0.85, 1).normalize(),
  perspective: new THREE.Vector3(1.1, 0.55, 1.3).normalize(),
};

export function getViewDirection(key) {
  return (VIEW_DIRECTIONS[key] || VIEW_DIRECTIONS.iso).clone();
}

export function getFitDistance(camera, radius, margin = 1.3) {
  const fovRad = THREE.MathUtils.degToRad(camera.fov || 40);
  return (radius / Math.sin(fovRad / 2)) * margin;
}
