import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { screenToWorld } from './canvasGeometry';

// Click-to-place flow: Palette.handleAddCatalogProduct puts a catalog item
// id into the store (placingCatalogItemId). While that's set, this hook
// tracks a world-space preview position that follows the pointer over the
// 2D stage; a click on the stage confirms the placement at that position
// and clears placement mode. Escape cancels without placing anything.
export function useProductPlacement({ scale, offsetX, offsetY, activeFloorId }) {
  const placingCatalogItemId = useAppStore((s) => s.placingCatalogItemId);
  const catalogItems = useAppStore((s) => s.catalogItems);
  const placeCatalogProductAt = useAppStore((s) => s.placeCatalogProductAt);
  const cancelPlacingProduct = useAppStore((s) => s.cancelPlacingProduct);
  const selectObject = useAppStore((s) => s.selectObject);

  const [previewWorldPos, setPreviewWorldPos] = useState(null);

  const isPlacing = Boolean(placingCatalogItemId);
  const placingItem = isPlacing
    ? catalogItems.find((item) => item.id === placingCatalogItemId) ?? null
    : null;

  useEffect(() => {
    if (!isPlacing) setPreviewWorldPos(null);
  }, [isPlacing]);

  useEffect(() => {
    if (!isPlacing) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') cancelPlacingProduct();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacing, cancelPlacingProduct]);

  function handleStagePointerMove(e) {
    if (!isPlacing) return;
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    setPreviewWorldPos(screenToWorld(pointer.x, pointer.y, scale, offsetX, offsetY));
  }

  // Returns true when it consumed the click (placement mode is top priority —
  // the caller should skip pan/select handling for this event).
  function handleStageClick(e) {
    if (!isPlacing || !placingItem || !activeFloorId) return isPlacing;
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return true;

    const world = screenToWorld(pointer.x, pointer.y, scale, offsetX, offsetY);
    const newId = placeCatalogProductAt(placingItem.id, activeFloorId, world.x, world.y);
    cancelPlacingProduct();
    setPreviewWorldPos(null);
    if (newId) selectObject(newId);
    return true;
  }

  return {
    isPlacing,
    placingItem,
    previewWorldPos,
    handleStagePointerMove,
    handleStageClick,
  };
}
