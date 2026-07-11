import { useEffect } from 'react';
import { ProductViewer } from './ProductViewer';
import './ProductViewerModal.css';

export function ProductViewerModal({ product, onUpdate, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  return (
    <div className="product-viewer-modal__backdrop" onClick={onClose}>
      <div className="product-viewer-modal__card" onClick={(e) => e.stopPropagation()}>
        <ProductViewer product={product} onUpdate={onUpdate} onClose={onClose} />
      </div>
    </div>
  );
}
