import { useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Loader, OrbitControls } from '@react-three/drei';
import { ViewerStoreContext, useViewerStore } from './ViewerContext';
import { createViewerStore } from './viewerStore';
import { SceneLighting } from './SceneLighting';
import { ProductLoader } from './ProductLoader';
import { CameraController } from './CameraController';
import { ViewButtons } from './ViewButtons';
import { ProductInfoPanel } from './ProductInfoPanel';
import { ViewerErrorBoundary } from './ViewerErrorBoundary';
import './ProductViewer.css';

function SceneContent({ product }) {
  const controlsRef = useRef(null);
  const bounds = useViewerStore((s) => s.bounds);
  const autoRotate = useViewerStore((s) => s.autoRotate);
  const setBounds = useViewerStore((s) => s.setBounds);
  const setActiveView = useViewerStore((s) => s.setActiveView);

  const handleBoundsReady = useCallback((b) => setBounds(b), [setBounds]);
  const radius = bounds?.radius ?? 1.5;

  return (
    <>
      <SceneLighting radius={radius} />
      <ViewerErrorBoundary fallback={null}>
        <Environment preset="apartment" />
      </ViewerErrorBoundary>
      <ProductLoader product={product} onBoundsReady={handleBoundsReady} />
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.45}
        scale={Math.max(radius * 6, 4)}
        blur={2.4}
        far={Math.max(radius * 2, 2)}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={2.2}
        minDistance={Math.max(radius * 1.15, 0.3)}
        maxDistance={Math.max(radius * 6, 3)}
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI - 0.001}
        onStart={() => setActiveView('free')}
      />
      <CameraController controlsRef={controlsRef} />
    </>
  );
}

export function ProductViewer({ product, onUpdate, onClose }) {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createViewerStore();

  return (
    <ViewerStoreContext.Provider value={storeRef.current}>
      <div className="product-viewer">
        <div className="product-viewer__header">
          <h2>{product.label || '제품 보기'}</h2>
          <button type="button" className="product-viewer__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="product-viewer__body">
          <div className="product-viewer__stage">
            <ViewerErrorBoundary
              fallback={
                <div className="product-viewer__error">
                  3D 미리보기를 불러오지 못했습니다.
                  <br />
                  네트워크 연결을 확인한 뒤 다시 열어주세요.
                </div>
              }
            >
              <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ fov: 40, near: 0.05, far: 100, position: [3, 2.4, 3] }}
              >
                <color attach="background" args={['#eef0f4']} />
                <SceneContent product={product} />
              </Canvas>
              <Loader
                containerStyles={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(238, 240, 244, 0.85)',
                }}
                innerStyles={{ width: 140, height: 4, background: '#d1d5db' }}
                barStyles={{ height: 4, background: '#4338ca' }}
                dataStyles={{ color: '#374151', fontSize: 12, marginTop: 10 }}
                dataInterpolation={(p) => `불러오는 중... ${p.toFixed(0)}%`}
              />
            </ViewerErrorBoundary>
            <ViewButtons />
            {!product.modelUrl && (
              <div className="product-viewer__badge">
                {product.imageDataUrl ? '사진 스탠디 (3D 모델 없음)' : '3D 모델 없음'}
              </div>
            )}
          </div>
          <ProductInfoPanel product={product} onUpdate={onUpdate} />
        </div>
      </div>
    </ViewerStoreContext.Provider>
  );
}
