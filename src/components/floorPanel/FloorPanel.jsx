import { useAppStore } from '../../store/useAppStore';
import './FloorPanel.css';

export function FloorPanel() {
  const floors = useAppStore((s) => s.floors);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const setActiveFloor = useAppStore((s) => s.setActiveFloor);
  const building = useAppStore((s) => s.building);
  const resetBuilding = useAppStore((s) => s.resetBuilding);

  return (
    <aside className="floor-panel">
      <h2>층</h2>
      <ul className="floor-panel__list">
        {[...floors].reverse().map((floor) => (
          <li key={floor.id}>
            <button
              type="button"
              className={`floor-panel__item ${floor.id === activeFloorId ? 'is-active' : ''}`}
              onClick={() => setActiveFloor(floor.id)}
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
          <p>
            풋프린트 {building.footprint.widthM.toFixed(1)}m × {building.footprint.depthM.toFixed(1)}m
          </p>
          <button type="button" className="floor-panel__reset" onClick={resetBuilding}>
            건물 다시 만들기
          </button>
        </div>
      )}
    </aside>
  );
}
