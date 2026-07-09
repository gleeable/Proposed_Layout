import { useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { removeImageBackground } from '../../services/backgroundRemoval';
import { generateProductImage } from '../../services/imageGeneration';
import './ProductPanel.css';

function defaultLabelFromFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, '');
}

export function ProductPanel() {
  const catalogItems = useAppStore((s) => s.catalogItems);
  const addPhotoProduct = useAppStore((s) => s.addPhotoProduct);
  const addGeneratedProduct = useAppStore((s) => s.addGeneratedProduct);
  const removeCatalogItem = useAppStore((s) => s.removeCatalogItem);

  const fileInputRef = useRef(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [generatedName, setGeneratedName] = useState('');
  const [generateStatus, setGenerateStatus] = useState('idle');
  const [generateError, setGenerateError] = useState('');
  const [generateProgressText, setGenerateProgressText] = useState('');

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({
      previewUrl,
      processedDataUrl: null,
      status: 'processing',
      label: defaultLabelFromFileName(file.name),
    });
    setProgressText('배경 제거 준비 중...');

    removeImageBackground(file, {
      onProgress: (key, current, total) => {
        if (total > 0) {
          setProgressText(`배경 제거 중... ${Math.round((current / total) * 100)}%`);
        }
      },
    })
      .then((dataUrl) => {
        setPendingPhoto((prev) => (prev ? { ...prev, processedDataUrl: dataUrl, status: 'ready' } : prev));
        setProgressText('');
      })
      .catch(() => {
        setPendingPhoto((prev) => (prev ? { ...prev, status: 'error' } : prev));
        setProgressText('');
      });
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function handlePaste(e) {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  }

  function handleRegisterPhoto() {
    if (!pendingPhoto || pendingPhoto.status !== 'ready') return;
    addPhotoProduct({ label: pendingPhoto.label, imageDataUrl: pendingPhoto.processedDataUrl });
    URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto(null);
  }

  function handleCancelPhoto() {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl);
    setPendingPhoto(null);
    setProgressText('');
  }

  async function handleGenerate() {
    const label = generatedName.trim();
    if (!label) return;

    setGenerateStatus('generating');
    setGenerateError('');
    setGenerateProgressText('이미지 생성 중...');
    try {
      const rawImageDataUrl = await generateProductImage(label);

      let imageDataUrl = rawImageDataUrl;
      setGenerateProgressText('배경 제거 중...');
      try {
        imageDataUrl = await removeImageBackground(rawImageDataUrl, {
          onProgress: (key, current, total) => {
            if (total > 0) {
              setGenerateProgressText(`배경 제거 중... ${Math.round((current / total) * 100)}%`);
            }
          },
        });
      } catch {
        // 누끼 실패 시 원본(흰 배경) 이미지라도 사용
      }

      addGeneratedProduct({ label, imageDataUrl });
      setGeneratedName('');
      setGenerateStatus('idle');
    } catch (err) {
      addGeneratedProduct({ label });
      setGeneratedName('');
      setGenerateStatus('error');
      setGenerateError(`이미지 생성 실패로 기본 오브젝트로 대체했습니다: ${err.message}`);
    } finally {
      setGenerateProgressText('');
    }
  }

  return (
    <div className="product-panel">
      <section className="product-panel__section">
        <h2>사진으로 등록</h2>
        <div
          className="product-panel__dropzone"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          {!pendingPhoto && (
            <p>클릭해서 파일 선택 · 드래그해서 놓기 · 여기 클릭 후 Ctrl+V로 붙여넣기</p>
          )}
          {pendingPhoto && (
            <div className="product-panel__preview">
              <img src={pendingPhoto.processedDataUrl || pendingPhoto.previewUrl} alt="미리보기" />
              {pendingPhoto.status === 'processing' && <p>{progressText || '배경 제거 중...'}</p>}
              {pendingPhoto.status === 'error' && <p className="product-panel__error">배경 제거 실패 — 다시 시도해주세요.</p>}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {pendingPhoto && (
          <div className="product-panel__pending-actions" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={pendingPhoto.label}
              onChange={(e) => setPendingPhoto((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="제품 이름"
            />
            <div className="product-panel__pending-buttons">
              <button type="button" onClick={handleCancelPhoto}>취소</button>
              <button type="button" disabled={pendingPhoto.status !== 'ready'} onClick={handleRegisterPhoto}>
                제품으로 등록
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="product-panel__section">
        <h2>이름으로 생성</h2>
        <div className="product-panel__generate-row">
          <input
            type="text"
            value={generatedName}
            onChange={(e) => setGeneratedName(e.target.value)}
            placeholder="예: 테이블, 의자, 리셉션 데스크"
            disabled={generateStatus === 'generating'}
          />
          <button type="button" disabled={generateStatus === 'generating'} onClick={handleGenerate}>
            {generateStatus === 'generating' ? '생성 중...' : '생성'}
          </button>
        </div>
        <p className="product-panel__caption">
          {generateStatus === 'generating' && generateProgressText
            ? generateProgressText
            : 'AI가 이름에 맞는 제품 일러스트를 생성하고 배경을 자동으로 제거합니다 (수 초 소요).'}
        </p>
        {generateStatus === 'error' && <p className="product-panel__error">{generateError}</p>}
      </section>

      <section className="product-panel__section">
        <h2>등록된 제품 목록</h2>
        {catalogItems.length === 0 && <p className="product-panel__empty">아직 등록된 제품이 없습니다.</p>}
        <div className="product-panel__grid">
          {catalogItems.map((item) => (
            <div key={item.id} className="product-panel__card">
              {item.imageDataUrl ? (
                <img src={item.imageDataUrl} alt={item.label} />
              ) : (
                <div className="product-panel__swatch">{item.label.slice(0, 1)}</div>
              )}
              <span>{item.label}</span>
              <button type="button" onClick={() => removeCatalogItem(item.id)}>삭제</button>
            </div>
          ))}
        </div>
        <p className="product-panel__hint">
          디자인 탭 왼쪽 팔레트의 "내 제품" 섹션에서 클릭하면 활성 층에 배치됩니다.
        </p>
      </section>
    </div>
  );
}
