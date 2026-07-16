import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import './LayoutEditBar.css';

const DEFAULT_FLOOR_HEIGHT_M = 3;

export function LayoutEditBar() {
  const isEditingLayout = useAppStore((s) => s.isEditingLayout);
  const building = useAppStore((s) => s.building);
  const floors = useAppStore((s) => s.floors);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const selectedFloorIds = useAppStore((s) => s.selectedFloorIds);
  const resizeFootprint = useAppStore((s) => s.resizeFootprint);
  const setBuildingHeight = useAppStore((s) => s.setBuildingHeight);
  const toggleEditingLayout = useAppStore((s) => s.toggleEditingLayout);

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const footprint = activeFloor?.footprint ?? building?.footprint;
  const widthM = footprint?.widthM ?? 0;
  const depthM = footprint?.depthM ?? 0;
  const heightM = building?.heightM || (building?.floorCount || 1) * DEFAULT_FLOOR_HEIGHT_M;
  const selectedCount = selectedFloorIds.length;

  const [form, setForm] = useState({ widthM, depthM, heightM });

  // Drag handles in the canvas update the store directly (live, during
  // drag) — keep the number inputs in sync with that unless the user is
  // actively typing in them.
  useEffect(() => {
    setForm({ widthM, depthM, heightM });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthM, depthM, heightM]);

  if (!isEditingLayout || !building) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function commit(field) {
    const value = Number(form[field]);
    if (!Number.isFinite(value) || value <= 0) return;
    if (field === 'widthM') resizeFootprint({ widthM: value });
    else if (field === 'depthM') resizeFootprint({ depthM: value });
    else if (field === 'heightM') setBuildingHeight(value);
  }

  function handleKeyDown(e, field) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div className="layout-edit-bar">
      <span className="layout-edit-bar__hint">
        레이아웃 편집 모드 — 캔버스 모서리를 드래그하거나 값을 입력하세요 (F7로 종료)
        {selectedCount > 1 ? ` — ${selectedCount}개 층에 동시 적용` : ''}
      </span>
      <label>
        가로(m)
        <input
          type="number"
          min="1"
          step="0.1"
          value={form.widthM}
          onChange={(e) => handleChange('widthM', e.target.value)}
          onBlur={() => commit('widthM')}
          onKeyDown={(e) => handleKeyDown(e, 'widthM')}
        />
      </label>
      <label>
        세로(m)
        <input
          type="number"
          min="1"
          step="0.1"
          value={form.depthM}
          onChange={(e) => handleChange('depthM', e.target.value)}
          onBlur={() => commit('depthM')}
          onKeyDown={(e) => handleKeyDown(e, 'depthM')}
        />
      </label>
      <label>
        높이(m)
        <input
          type="number"
          min="1"
          step="0.1"
          value={form.heightM}
          onChange={(e) => handleChange('heightM', e.target.value)}
          onBlur={() => commit('heightM')}
          onKeyDown={(e) => handleKeyDown(e, 'heightM')}
        />
      </label>
      <button type="button" onClick={toggleEditingLayout}>
        완료
      </button>
    </div>
  );
}
