import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { metersToMm, mmToMeters } from './canvasGeometry';
import './SelectionActionMenu.css';

const VIEWPORT_MARGIN_PX = 8;

// Right-click menu for a marquee-captured (or shift-)selected group of
// objects — bulk actions that don't need the single-object detail modal.
export function SelectionActionMenu({ ids, x, y, onClose }) {
  const objects = useAppStore((s) => s.objects);
  const groupObjects = useAppStore((s) => s.groupObjects);
  const ungroupObjects = useAppStore((s) => s.ungroupObjects);
  const rotateSelectionBy = useAppStore((s) => s.rotateSelectionBy);
  const duplicateSelection = useAppStore((s) => s.duplicateSelection);
  const removeObjects = useAppStore((s) => s.removeObjects);
  const updateSelectionColor = useAppStore((s) => s.updateSelectionColor);
  const updateSelectionSize = useAppStore((s) => s.updateSelectionSize);
  const updateSelectionVerticalHeight = useAppStore((s) => s.updateSelectionVerticalHeight);
  const setSelectedIds = useAppStore((s) => s.setSelectedIds);

  const [openPanel, setOpenPanel] = useState(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y, maxHeight: null });

  // The menu grows taller as panels (색깔/치수/높이) expand, so it's re-clamped
  // to the viewport every time openPanel changes, not just on the initial
  // right-click position — otherwise expanding a panel near the bottom/right
  // edge pushes its "적용" button off-screen and un-clickable. maxHeight +
  // the CSS overflow-y below is a fallback for viewports too short to fit
  // the menu even at top=margin.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxLeft = Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - rect.width - VIEWPORT_MARGIN_PX);
    const maxTop = Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - rect.height - VIEWPORT_MARGIN_PX);
    setPosition({
      left: Math.min(x, maxLeft),
      top: Math.min(y, maxTop),
      maxHeight: window.innerHeight - VIEWPORT_MARGIN_PX * 2,
    });
  }, [x, y, openPanel]);

  const selected = objects.filter((o) => ids.includes(o.id));
  const canGroup = ids.length >= 2;
  const canUngroup = selected.some((o) => o.groupId);
  const first = selected[0];
  const [widthMm, setWidthMm] = useState(() => Math.round(metersToMm(first?.width ?? 1)));
  const [depthMm, setDepthMm] = useState(() => Math.round(metersToMm(first?.height ?? 1)));
  const [heightMm, setHeightMm] = useState(() => Math.round(first?.verticalHeightMm ?? 800));

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (selected.length === 0) return null;

  function handleGroup() {
    groupObjects(ids);
    onClose();
  }

  function handleUngroup() {
    ungroupObjects(ids);
    onClose();
  }

  function handleRotate() {
    rotateSelectionBy(ids, 90);
    onClose();
  }

  function handleDuplicate() {
    const newIds = duplicateSelection(ids);
    setSelectedIds(newIds);
    onClose();
  }

  function handleDelete() {
    removeObjects(ids);
    onClose();
  }

  function handleColorChange(e) {
    updateSelectionColor(ids, e.target.value);
  }

  function handleApplySize() {
    const w = Number(widthMm);
    const d = Number(depthMm);
    if (w > 0 && d > 0) {
      updateSelectionSize(ids, mmToMeters(w), mmToMeters(d));
    }
    onClose();
  }

  function handleApplyHeight() {
    const h = Number(heightMm);
    if (h > 0) {
      updateSelectionVerticalHeight(ids, h);
    }
    onClose();
  }

  return (
    <div className="selection-action-menu__backdrop" onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className="selection-action-menu"
        style={{ left: position.left, top: position.top, maxHeight: position.maxHeight ?? undefined }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="selection-action-menu__title">{ids.length}개 오브젝트 선택됨</div>

        <button type="button" disabled={!canGroup} onClick={handleGroup}>
          그룹화하기
        </button>
        {canUngroup && (
          <button type="button" onClick={handleUngroup}>
            그룹 해제하기
          </button>
        )}

        <button type="button" onClick={handleRotate}>
          90도 회전
        </button>
        <button type="button" onClick={handleDuplicate}>
          복제하기
        </button>

        <div className="selection-action-menu__panel-toggle">
          <button type="button" onClick={() => setOpenPanel(openPanel === 'color' ? null : 'color')}>
            색깔 변경하기
          </button>
          {openPanel === 'color' && (
            <input
              type="color"
              autoFocus
              defaultValue={first?.fill || '#93c5fd'}
              onChange={handleColorChange}
            />
          )}
        </div>

        <div className="selection-action-menu__panel-toggle">
          <button type="button" onClick={() => setOpenPanel(openPanel === 'size' ? null : 'size')}>
            치수 변경하기
          </button>
          {openPanel === 'size' && (
            <div className="selection-action-menu__size-panel">
              <label>
                가로(mm)
                <input type="number" min="1" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} />
              </label>
              <label>
                세로(mm)
                <input type="number" min="1" value={depthMm} onChange={(e) => setDepthMm(e.target.value)} />
              </label>
              <button type="button" onClick={handleApplySize}>
                적용
              </button>
            </div>
          )}
        </div>

        <div className="selection-action-menu__panel-toggle">
          <button type="button" onClick={() => setOpenPanel(openPanel === 'height' ? null : 'height')}>
            높이 변경하기
          </button>
          {openPanel === 'height' && (
            <div className="selection-action-menu__size-panel">
              <label>
                높이(mm)
                <input type="number" min="1" value={heightMm} onChange={(e) => setHeightMm(e.target.value)} />
              </label>
              <button type="button" onClick={handleApplyHeight}>
                적용
              </button>
            </div>
          )}
        </div>

        <button type="button" className="selection-action-menu__danger" onClick={handleDelete}>
          삭제
        </button>
      </div>
    </div>
  );
}
