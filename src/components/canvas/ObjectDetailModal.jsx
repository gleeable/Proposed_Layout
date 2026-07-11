import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { metersToMm, mmToMeters } from './canvasGeometry';
import './ObjectDetailModal.css';

export function ObjectDetailModal({ objectId, onClose, onOpenViewer }) {
  const object = useAppStore((s) => s.objects.find((o) => o.id === objectId));
  const updateObjectDetails = useAppStore((s) => s.updateObjectDetails);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!object) {
      setForm(null);
      return;
    }
    setForm({
      widthMm: Math.round(metersToMm(object.width)),
      depthMm: Math.round(metersToMm(object.height)),
      verticalHeightMm: object.verticalHeightMm ?? 800,
      elevationMm: object.elevationMm ?? 0,
      rotation: object.rotation,
      label: object.label,
      memo: object.memo ?? '',
    });
  }, [object]);

  const isValid = Boolean(
    form && form.widthMm > 0 && form.depthMm > 0 && form.verticalHeightMm > 0 && form.elevationMm >= 0
  );

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!isValid) return;
    updateObjectDetails(objectId, {
      width: mmToMeters(Number(form.widthMm)),
      height: mmToMeters(Number(form.depthMm)),
      verticalHeightMm: Number(form.verticalHeightMm),
      elevationMm: Number(form.elevationMm),
      rotation: Number(form.rotation),
      label: form.label,
      memo: form.memo,
    });
    onClose();
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.isComposing && e.target?.tagName !== 'TEXTAREA') {
        // Enter auto-saves from anywhere in the modal (except the memo
        // textarea, where Enter should just insert a newline).
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, form, isValid]);

  if (!object || !form) return null;

  return (
    <div className="object-detail-modal__backdrop" onClick={onClose}>
      <div className="object-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>오브젝트 상세 설정</h2>

        <label>
          이름
          <input
            type="text"
            value={form.label}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </label>

        <div className="object-detail-modal__row">
          <label>
            가로 (mm)
            <input
              type="number"
              min="1"
              value={form.widthMm}
              onChange={(e) => handleChange('widthMm', e.target.value)}
            />
          </label>
          <label>
            세로 (mm)
            <input
              type="number"
              min="1"
              value={form.depthMm}
              onChange={(e) => handleChange('depthMm', e.target.value)}
            />
          </label>
        </div>

        <div className="object-detail-modal__row">
          <label>
            높이 (mm)
            <input
              type="number"
              min="1"
              value={form.verticalHeightMm}
              onChange={(e) => handleChange('verticalHeightMm', e.target.value)}
            />
          </label>
          <label>
            회전 각도
            <input
              type="number"
              value={form.rotation}
              onChange={(e) => handleChange('rotation', e.target.value)}
            />
          </label>
        </div>

        <label>
          바닥에서 띄우는 높이 (mm)
          <input
            type="number"
            min="0"
            value={form.elevationMm}
            onChange={(e) => handleChange('elevationMm', e.target.value)}
          />
        </label>

        <label>
          메모
          <textarea
            rows={3}
            value={form.memo}
            onChange={(e) => handleChange('memo', e.target.value)}
          />
        </label>

        <div className="object-detail-modal__actions">
          {onOpenViewer && (
            <button
              type="button"
              className="object-detail-modal__cancel object-detail-modal__viewer-btn"
              onClick={() => onOpenViewer(objectId)}
            >
              3D로 보기
            </button>
          )}
          <button type="button" className="object-detail-modal__cancel" onClick={onClose}>
            취소
          </button>
          <button type="button" disabled={!isValid} onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
