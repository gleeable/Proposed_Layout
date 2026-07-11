import { useViewerStore } from './ViewerContext';
import { VIEW_BUTTONS } from './viewerPresets';

export function ViewButtons() {
  const activeView = useViewerStore((s) => s.activeView);
  const autoRotate = useViewerStore((s) => s.autoRotate);
  const setActiveView = useViewerStore((s) => s.setActiveView);
  const toggleAutoRotate = useViewerStore((s) => s.toggleAutoRotate);

  return (
    <div className="product-viewer__view-panel">
      <div className="product-viewer__view-grid">
        {VIEW_BUTTONS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`product-viewer__view-btn ${activeView === v.key ? 'is-active' : ''}`}
            onClick={() => setActiveView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="product-viewer__view-actions">
        <button
          type="button"
          className={`product-viewer__view-btn product-viewer__view-btn--wide ${autoRotate ? 'is-active' : ''}`}
          onClick={toggleAutoRotate}
        >
          {autoRotate ? '자동 회전 중지' : '자동 회전'}
        </button>
        <button
          type="button"
          className="product-viewer__view-btn product-viewer__view-btn--wide"
          onClick={() => setActiveView('iso')}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
