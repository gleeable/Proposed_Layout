import { useAppStore } from '../../store/useAppStore';
import './FloorPanel.css';

export function FloorPanel() {
  const floors = useAppStore((s) => s.floors);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const selectedFloorIds = useAppStore((s) => s.selectedFloorIds);
  const setActiveFloor = useAppStore((s) => s.setActiveFloor);
  const building = useAppStore((s) => s.building);
  const resetBuilding = useAppStore((s) => s.resetBuilding);

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const activeFootprint = activeFloor?.footprint ?? building?.footprint;
  const multiSelected = selectedFloorIds.length > 1;

  function handleFloorClick(e, floorId) {
    setActiveFloor(floorId, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey });
  }

  return (
    <aside className="floor-panel">
      <h2>층</h2>
      <ul className="floor-panel__list">
        {[...floors].reverse().map((floor) => (
          <li key={floor.id}>
            <button
              type="button"
              className={[
                'floor-panel__item',
                floor.id === activeFloorId ? 'is-active' : '',
                selectedFloorIds.includes(floor.id) ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={(e) => handleFloorClick(e, floor.id)}
            >
              {floor.label}
            </button>
          </li>
        ))}
      </ul>

      {building && (
        <div className="floor-panel__summary">
          <p>
            대지 {building.siteAreaM2}㎡ · 건폐율 {building.bcrPercent}% · 용적률 {building.farPercent}%
          </p>
          {activeFootprint && (
            <p>
              풋프린트 {activeFootprint.widthM.toFixed(1)}m × {activeFootprint.depthM.toFixed(1)}m
            </p>
          )}
          {multiSelected && (
            <p>{selectedFloorIds.length}개 층 선택됨 — 치수 변경 시 함께 적용</p>
          )}
          <button type="button" className="floor-panel__reset" onClick={resetBuilding}>
            건물 다시 만들기
          </button>
        </div>
      )}
    </aside>
  );
}
