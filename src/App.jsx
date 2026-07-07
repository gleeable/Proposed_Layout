import './App.css';
import { AppShell } from './components/layout/AppShell';
import { BuildingSetupForm } from './components/building/BuildingSetupForm';
import { FloorPanel } from './components/floorPanel/FloorPanel';
import { Palette } from './components/canvas/Palette';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import { DesignCanvas } from './components/canvas/DesignCanvas';
import { ProductPanel } from './components/product/ProductPanel';
import { useAppStore } from './store/useAppStore';

function DesignTab() {
  const building = useAppStore((s) => s.building);

  if (!building) {
    return <BuildingSetupForm />;
  }

  return (
    <div className="design-layout">
      <Palette />
      <div className="design-layout__main">
        <CanvasToolbar />
        <DesignCanvas />
      </div>
      <FloorPanel />
    </div>
  );
}

function App() {
  return <AppShell designContent={<DesignTab />} productContent={<ProductPanel />} />;
}

export default App;
