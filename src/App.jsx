import { useEffect, useRef } from 'react';
import './App.css';
import { AppShell } from './components/layout/AppShell';
import { BuildingSetupForm } from './components/building/BuildingSetupForm';
import { FloorPanel } from './components/floorPanel/FloorPanel';
import { Palette } from './components/canvas/Palette';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import { CanvasViewToggle } from './components/canvas/CanvasViewToggle';
import { LayoutEditBar } from './components/canvas/LayoutEditBar';
import { DesignCanvas } from './components/canvas/DesignCanvas';
import { CanvasErrorBoundary } from './components/canvas/CanvasErrorBoundary';
import { Design3DView } from './components/canvas/Design3DView';
import { ProductPanel } from './components/product/ProductPanel';
import { StorageStatusBanner } from './components/StorageStatusBanner';
import { useAppStore } from './store/useAppStore';
import { saveImageAsPdf } from './services/pdfExport';

// Long enough for Design3DView to mount, run its first WebGL frame, and let
// the async per-object average-color sampling (Design3DView's
// useAverageColor) settle, when the 3D tab wasn't already open.
const VIEW_SWITCH_SETTLE_MS = 500;

function DesignTab({ design3DRef }) {
  const building = useAppStore((s) => s.building);
  const canvasViewMode = useAppStore((s) => s.canvasViewMode);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'F7') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault(); // Firefox otherwise prompts to toggle caret browsing
      useAppStore.getState().toggleEditingLayout();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!building) {
    return <BuildingSetupForm />;
  }

  return (
    <div className="design-layout">
      <Palette />
      <div className="design-layout__main">
        <LayoutEditBar />
        <CanvasViewToggle />
        <CanvasToolbar />
        {canvasViewMode === '3d' ? (
          <Design3DView ref={design3DRef} />
        ) : (
          <CanvasErrorBoundary>
            <DesignCanvas />
          </CanvasErrorBoundary>
        )}
      </div>
      <FloorPanel />
    </div>
  );
}

function App() {
  const building = useAppStore((s) => s.building);
  const canvasViewMode = useAppStore((s) => s.canvasViewMode);
  const setCanvasViewMode = useAppStore((s) => s.setCanvasViewMode);
  const design3DRef = useRef(null);

  async function handleSavePdf() {
    if (!building) return;

    const previousMode = canvasViewMode;
    if (previousMode !== '3d') {
      setCanvasViewMode('3d');
      await new Promise((resolve) => setTimeout(resolve, VIEW_SWITCH_SETTLE_MS));
    }

    const imageDataUrl = design3DRef.current?.captureImage();

    if (previousMode !== '3d') {
      setCanvasViewMode(previousMode);
    }

    if (!imageDataUrl) return;
    await saveImageAsPdf(imageDataUrl, '공간배치-3d.pdf');
  }

  return (
    <>
      <StorageStatusBanner />
      <AppShell
        designContent={<DesignTab design3DRef={design3DRef} />}
        productContent={<ProductPanel />}
        onSavePdf={handleSavePdf}
        canSavePdf={Boolean(building)}
      />
    </>
  );
}

export default App;
