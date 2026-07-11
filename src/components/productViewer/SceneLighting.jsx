export function SceneLighting({ radius = 1.5 }) {
  const shadowExtent = Math.max(2, radius * 1.6);
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[radius * 2, radius * 3, radius * 2.2]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={Math.max(8, radius * 8)}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-radius * 2, radius * 1.5, -radius * 1.5]} intensity={0.3} />
    </>
  );
}
