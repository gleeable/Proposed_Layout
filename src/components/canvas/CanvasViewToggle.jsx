import { useAppStore } from '../../store/useAppStore';
import './CanvasViewToggle.css';

const VIEW_MODES = [
  { key: '2d', label: '2D' },
  { key: '3d', label: '3D' },
];

export function CanvasViewToggle() {
  const canvasViewMode = useAppStore((s) => s.canvasViewMode);
  const setCanvasViewMode = useAppStore((s) => s.setCanvasViewMode);
  const isRulerActive = useAppStore((s) => s.isRulerActive);
  const toggleRulerMode = useAppStore((s) => s.toggleRulerMode);

  return (
    <div className="canvas-view-toggle">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.key}
          type="button"
          className={`canvas-view-toggle__btn ${canvasViewMode === mode.key ? 'is-active' : ''}`}
          onClick={() => setCanvasViewMode(mode.key)}
        >
          {mode.label}
        </button>
      ))}
      <button
        type="button"
        className={`canvas-view-toggle__btn ${isRulerActive ? 'is-active' : ''}`}
        onClick={toggleRulerMode}
        title="자 도구 (단축키: M)"
      >
        자
      </button>
    </div>
  );
}
