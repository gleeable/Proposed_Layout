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
  const isFirstPersonMode = useAppStore((s) => s.isFirstPersonMode);
  const toggleFirstPersonMode = useAppStore((s) => s.toggleFirstPersonMode);
  const is3D = canvasViewMode === '3d';

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
      {/* Only meaningful in 3D — walks the camera itself around at eye
          height instead of showing a 3rd-person avatar. */}
      <button
        type="button"
        disabled={!is3D}
        className={`canvas-view-toggle__btn ${isFirstPersonMode ? 'is-active' : ''}`}
        onClick={toggleFirstPersonMode}
        title={is3D ? '1인칭 시점 (화살표 키로 이동, 눈높이 160cm)' : '3D 화면에서만 사용할 수 있습니다'}
      >
        1인칭
      </button>
    </div>
  );
}
