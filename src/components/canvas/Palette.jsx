import { useAppStore } from '../../store/useAppStore';
import { FACILITY_CATALOG } from '../../domain/facilityCatalog';
import './Palette.css';

export function Palette() {
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const addFacility = useAppStore((s) => s.addFacility);
  const addGeneric = useAppStore((s) => s.addGeneric);
  const selectObject = useAppStore((s) => s.selectObject);

  function handleAddFacility(category) {
    if (!activeFloorId) return;
    const id = addFacility(category, activeFloorId);
    if (id) selectObject(id);
  }

  function handleAddGeneric() {
    if (!activeFloorId) return;
    const id = addGeneric(activeFloorId);
    if (id) selectObject(id);
  }

  return (
    <aside className="palette">
      <h2>기본 시설</h2>
      <div className="palette__grid">
        {FACILITY_CATALOG.map((item) => (
          <button
            key={item.category}
            type="button"
            className="palette__item"
            onClick={() => handleAddFacility(item.category)}
          >
            <span className="palette__swatch" style={{ background: item.fill }} />
            {item.label}
          </button>
        ))}
      </div>

      <h2>일반 오브젝트</h2>
      <button type="button" className="palette__item palette__item--generic" onClick={handleAddGeneric}>
        <span className="palette__swatch" style={{ background: '#93C5FD' }} />
        오브젝트 추가
      </button>
    </aside>
  );
}
