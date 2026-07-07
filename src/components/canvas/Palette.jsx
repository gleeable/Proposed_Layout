import { useAppStore } from '../../store/useAppStore';
import { FACILITY_CATALOG } from '../../domain/facilityCatalog';
import './Palette.css';

export function Palette() {
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const addFacility = useAppStore((s) => s.addFacility);
  const addGeneric = useAppStore((s) => s.addGeneric);
  const addCatalogProduct = useAppStore((s) => s.addCatalogProduct);
  const catalogItems = useAppStore((s) => s.catalogItems);
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

  function handleAddCatalogProduct(catalogItemId) {
    if (!activeFloorId) return;
    const id = addCatalogProduct(catalogItemId, activeFloorId);
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

      <h2>내 제품</h2>
      {catalogItems.length === 0 && <p className="palette__empty">제품 탭에서 먼저 등록해주세요.</p>}
      <div className="palette__grid">
        {catalogItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="palette__item"
            onClick={() => handleAddCatalogProduct(item.id)}
          >
            {item.imageDataUrl ? (
              <img className="palette__thumb" src={item.imageDataUrl} alt={item.label} />
            ) : (
              <span className="palette__swatch" style={{ background: '#93C5FD' }} />
            )}
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
