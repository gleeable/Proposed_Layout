import './App.css';
import { AppShell } from './components/layout/AppShell';
import { BuildingSetupForm } from './components/building/BuildingSetupForm';
import { FloorPanel } from './components/floorPanel/FloorPanel';
import { Palette } from './components/canvas/Palette';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import { CanvasViewToggle } from './components/canvas/CanvasViewToggle';
import { DesignCanvas } from './components/canvas/DesignCanvas';
import { CanvasErrorBoundary } from './components/canvas/CanvasErrorBoundary';
import { Design3DView } from './components/canvas/Design3DView';
import { ProductPanel } from './components/product/ProductPanel';
import { useAppStore } from './store/useAppStore';

function DesignTab() {
  const building = useAppStore((s) => s.building);
  const canvasViewMode = useAppStore((s) => s.canvasViewMode);

  if (!building) {
    return <BuildingSetupForm />;
  }

  return (
    <div className="design-layout">
      <Palette />
      <div className="design-layout__main">
        <CanvasViewToggle />
        <CanvasToolbar />
        {canvasViewMode === '3d' ? (
          <Design3DView />
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
  return <AppShell designContent={<DesignTab />} productContent={<ProductPanel />} />;
}

export default App;
