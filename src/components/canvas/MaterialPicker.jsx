import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, getMaterialsByCategory } from '../../domain/materialCatalog';
import { renderMaterialThumbnail } from '../../services/materialTexture';
import { generateMaterialImage } from '../../services/materialGeneration';
import './MaterialPicker.css';

// Built-in swatches are re-rendered from their pattern description on first
// use rather than shipped as image assets — cache the resulting data URL so
// re-opening/re-rendering the picker doesn't redraw all ~30 canvases again.
const thumbnailCache = new Map();
function getBuiltinThumbnail(material) {
  if (!thumbnailCache.has(material.id)) {
    thumbnailCache.set(material.id, renderMaterialThumbnail(material));
  }
  return thumbnailCache.get(material.id);
}

export function MaterialPicker() {
  const [activeCategory, setActiveCategory] = useState('wallpaper');
  const [requestName, setRequestName] = useState('');
  const [requestStatus, setRequestStatus] = useState('idle');
  const [requestError, setRequestError] = useState('');

  const wallMaterialId = useAppStore((s) => s.wallMaterialId);
  const floorMaterialId = useAppStore((s) => s.floorMaterialId);
  const customMaterials = useAppStore((s) => s.customMaterials);
  const setWallMaterial = useAppStore((s) => s.setWallMaterial);
  const setFloorMaterial = useAppStore((s) => s.setFloorMaterial);
  const addCustomMaterial = useAppStore((s) => s.addCustomMaterial);
  const removeCustomMaterial = useAppStore((s) => s.removeCustomMaterial);

  const items = useMemo(() => {
    const builtin = getMaterialsByCategory(activeCategory);
    const custom = customMaterials.filter((m) => m.category === activeCategory);
    return [...builtin, ...custom];
  }, [activeCategory, customMaterials]);

  const canApplyToWall = activeCategory === 'wallpaper' || activeCategory === 'tile';
  const canApplyToFloor = activeCategory === 'floor' || activeCategory === 'tile';

  async function handleRequestGenerate() {
    const name = requestName.trim();
    if (!name) return;
    setRequestStatus('generating');
    setRequestError('');
    try {
      const imageDataUrl = await generateMaterialImage(name);
      addCustomMaterial({ category: activeCategory, label: name, imageDataUrl });
      setRequestName('');
      setRequestStatus('idle');
    } catch (err) {
      setRequestStatus('error');
      setRequestError(`마감재 생성 실패: ${err.message}`);
    }
  }

  return (
    <div className="material-picker">
      <div className="material-picker__tabs">
        {MATERIAL_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`material-picker__tab ${activeCategory === category ? 'is-active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {MATERIAL_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className="material-picker__grid">
        {items.map((material) => {
          const isCustom = Boolean(material.imageDataUrl);
          const thumb = isCustom ? material.imageDataUrl : getBuiltinThumbnail(material);
          const isWall = wallMaterialId === material.id;
          const isFloor = floorMaterialId === material.id;
          return (
            <div key={material.id} className={`material-picker__card ${isWall || isFloor ? 'is-applied' : ''}`}>
              <img className="material-picker__swatch" src={thumb} alt={material.label} title={material.label} />
              <span className="material-picker__label">{material.label}</span>
              <div className="material-picker__apply-row">
                {canApplyToWall && (
                  <button
                    type="button"
                    className={isWall ? 'is-active' : ''}
                    onClick={() => setWallMaterial(isWall ? null : material.id)}
                  >
                    벽{isWall ? ' ✓' : ''}
                  </button>
                )}
                {canApplyToFloor && (
                  <button
                    type="button"
                    className={isFloor ? 'is-active' : ''}
                    onClick={() => setFloorMaterial(isFloor ? null : material.id)}
                  >
                    바닥{isFloor ? ' ✓' : ''}
                  </button>
                )}
                {isCustom && (
                  <button type="button" className="material-picker__remove" onClick={() => removeCustomMaterial(material.id)}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="material-picker__request">
        <input
          type="text"
          value={requestName}
          onChange={(e) => setRequestName(e.target.value)}
          placeholder={`예: ${MATERIAL_CATEGORY_LABELS[activeCategory]} 이름으로 요청`}
          disabled={requestStatus === 'generating'}
        />
        <button type="button" disabled={requestStatus === 'generating'} onClick={handleRequestGenerate}>
          {requestStatus === 'generating' ? '생성 중...' : 'AI로 마감재 요청'}
        </button>
        {requestStatus === 'error' && <p className="material-picker__error">{requestError}</p>}
      </div>
    </div>
  );
}
