import { useEffect, useState } from 'react';
import { metersToMm, mmToMeters } from '../canvas/canvasGeometry';

function toForm(product) {
  return {
    label: product.label || '',
    brand: product.brand || '',
    material: product.material || '',
    color: product.color || '',
    manufacturer: product.manufacturer || '',
    link: product.link || '',
    memo: product.memo || '',
    widthMm: Math.round(metersToMm(product.width || 1)),
    depthMm: Math.round(metersToMm(product.height || 1)),
    heightMm: Math.round(product.verticalHeightMm || 800),
  };
}

export function ProductInfoPanel({ product, onUpdate }) {
  const [form, setForm] = useState(() => toForm(product));

  useEffect(() => {
    setForm(toForm(product));
  }, [product.id]);

  function commitText(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    onUpdate({ [field]: value });
  }

  function commitDimension(field, storeField, value, convert) {
    setForm((prev) => ({ ...prev, [field]: value }));
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    onUpdate({ [storeField]: convert(n) });
  }

  const canOpenLink = /^https?:\/\//i.test(form.link.trim());

  return (
    <div className="product-viewer-info">
      <label className="product-viewer-info__field">
        <span>제품명</span>
        <input type="text" value={form.label} onChange={(e) => commitText('label', e.target.value)} />
      </label>

      <div className="product-viewer-info__row">
        <label className="product-viewer-info__field">
          <span>브랜드</span>
          <input type="text" value={form.brand} onChange={(e) => commitText('brand', e.target.value)} />
        </label>
        <label className="product-viewer-info__field">
          <span>제조사</span>
          <input type="text" value={form.manufacturer} onChange={(e) => commitText('manufacturer', e.target.value)} />
        </label>
      </div>

      <div className="product-viewer-info__row">
        <label className="product-viewer-info__field">
          <span>소재</span>
          <input type="text" value={form.material} onChange={(e) => commitText('material', e.target.value)} />
        </label>
        <label className="product-viewer-info__field">
          <span>색상</span>
          <input type="text" value={form.color} onChange={(e) => commitText('color', e.target.value)} />
        </label>
      </div>

      <div className="product-viewer-info__field">
        <span>규격 (mm)</span>
        <div className="product-viewer-info__dims">
          <input
            type="number"
            min="1"
            value={form.widthMm}
            onChange={(e) => commitDimension('widthMm', 'width', e.target.value, mmToMeters)}
            aria-label="가로"
          />
          <span className="product-viewer-info__dims-x">×</span>
          <input
            type="number"
            min="1"
            value={form.depthMm}
            onChange={(e) => commitDimension('depthMm', 'height', e.target.value, mmToMeters)}
            aria-label="세로"
          />
          <span className="product-viewer-info__dims-x">×</span>
          <input
            type="number"
            min="1"
            value={form.heightMm}
            onChange={(e) => commitDimension('heightMm', 'verticalHeightMm', e.target.value, (n) => n)}
            aria-label="높이"
          />
        </div>
      </div>

      <label className="product-viewer-info__field">
        <span>제품 링크</span>
        <input
          type="url"
          placeholder="https://"
          value={form.link}
          onChange={(e) => commitText('link', e.target.value)}
        />
        {canOpenLink && (
          <a className="product-viewer-info__link" href={form.link} target="_blank" rel="noopener noreferrer">
            링크 열기 ↗
          </a>
        )}
      </label>

      <label className="product-viewer-info__field">
        <span>메모</span>
        <textarea rows={3} value={form.memo} onChange={(e) => commitText('memo', e.target.value)} />
      </label>
    </div>
  );
}
