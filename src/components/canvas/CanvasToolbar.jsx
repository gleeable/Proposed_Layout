import { useAppStore } from '../../store/useAppStore';
import './CanvasToolbar.css';

export function CanvasToolbar() {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const objects = useAppStore((s) => s.objects);
  const floors = useAppStore((s) => s.floors);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const rotateSelectionBy = useAppStore((s) => s.rotateSelectionBy);
  const flipSelection = useAppStore((s) => s.flipSelection);
  const duplicateSelection = useAppStore((s) => s.duplicateSelection);
  const removeObjects = useAppStore((s) => s.removeObjects);
  const moveObjectsToFloor = useAppStore((s) => s.moveObjectsToFloor);
  const groupObjects = useAppStore((s) => s.groupObjects);
  const ungroupObjects = useAppStore((s) => s.ungroupObjects);
  const setSelectedIds = useAppStore((s) => s.setSelectedIds);

  if (selectedIds.length === 0) {
    return (
      <div className="canvas-toolbar canvas-toolbar--empty">
        오브젝트를 선택하면 편집 도구가 나타납니다.
      </div>
    );
  }

  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
  const isMulti = selectedIds.length > 1;
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedObjects.some((o) => o.groupId);

  function handleDuplicate() {
    const newIds = duplicateSelection(selectedIds);
    setSelectedIds(newIds);
  }

  function handleMoveFloor(e) {
    const floorId = e.target.value;
    if (!floorId) return;
    moveObjectsToFloor(selectedIds, floorId);
    e.target.value = '';
  }

  return (
    <div className="canvas-toolbar">
      <button type="button" onClick={() => rotateSelectionBy(selectedIds, 90)}>
        회전
      </button>
      <button type="button" disabled={isMulti} onClick={() => flipSelection(selectedIds, 'x')}>
        좌우 반전
      </button>
      <button type="button" disabled={isMulti} onClick={() => flipSelection(selectedIds, 'y')}>
        상하 반전
      </button>
      <button type="button" onClick={handleDuplicate}>
        복사
      </button>
      <button type="button" onClick={() => removeObjects(selectedIds)}>
        삭제
      </button>
      <select defaultValue="" onChange={handleMoveFloor}>
        <option value="" disabled>
          다른 층으로 이동
        </option>
        {floors
          .filter((f) => f.id !== activeFloorId)
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
      </select>
      <button type="button" disabled={!canGroup} onClick={() => groupObjects(selectedIds)}>
        그룹
      </button>
      <button type="button" disabled={!canUngroup} onClick={() => ungroupObjects(selectedIds)}>
        그룹 해제
      </button>
    </div>
  );
}
