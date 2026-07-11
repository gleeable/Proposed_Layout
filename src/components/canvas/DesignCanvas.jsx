import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';
import { computeFitScale, computeFootprintOffset } from './canvasGeometry';
import { FootprintOutline } from './FootprintOutline';
import { PlacedObjectShape } from './PlacedObjectShape';
import { PlacementPreview } from './PlacementPreview';
import { SelectionTransformer } from './SelectionTransformer';
import { GroupDragProxy } from './GroupDragProxy';
import { ObjectDetailModal } from './ObjectDetailModal';
import { ProductViewerModal } from '../productViewer/ProductViewerModal';
import { useCanvasViewport } from './useCanvasViewport';
import { useProductPlacement } from './useProductPlacement';
import { useProductCopyDrag } from './useProductCopyDrag';
import { useKeyboardModifiers } from './useKeyboardModifiers';
import './DesignCanvas.css';

function isValidPlacedObject(o) {
  return (
    o &&
    typeof o.id === 'string' &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.width) &&
    Number.isFinite(o.height)
  );
}

export function DesignCanvas() {
  const containerRef = useRef(null);
  const nodesMapRef = useRef(new Map());
  const [, bumpNodeVersion] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [detailObjectId, setDetailObjectId] = useState(null);
  const [viewerObjectId, setViewerObjectId] = useState(null);

  const building = useAppStore((s) => s.building);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const objects = useAppStore((s) => s.objects);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectObject = useAppStore((s) => s.selectObject);
  const setSelectedIds = useAppStore((s) => s.setSelectedIds);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const updateObjectPosition = useAppStore((s) => s.updateObjectPosition);
  const updateObjectTransform = useAppStore((s) => s.updateObjectTransform);
  const updateObjectDetails = useAppStore((s) => s.updateObjectDetails);
  const applyDeltaToSelection = useAppStore((s) => s.applyDeltaToSelection);
  const duplicateObjectAt = useAppStore((s) => s.duplicateObjectAt);
  const placingCatalogItemId = useAppStore((s) => s.placingCatalogItemId);

  const isPlacing = Boolean(placingCatalogItemId);
  const { ctrlRef } = useKeyboardModifiers();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const viewport = useCanvasViewport({
    containerRef,
    disabled: isPlacing,
    onEmptyClick: clearSelection,
  });

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const state = useAppStore.getState();
      if (state.placingCatalogItemId) return; // placement mode owns keyboard input (Escape) elsewhere
      if (state.selectedIds.length === 0) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.removeObjects(state.selectedIds);
      } else if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const newIds = state.duplicateSelection(state.selectedIds);
        state.setSelectedIds(newIds);
      } else if (e.key.toLowerCase() === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          state.ungroupObjects(state.selectedIds);
        } else {
          state.groupObjects(state.selectedIds);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const registerNodeRef = useCallback((id, node) => {
    if (node) {
      nodesMapRef.current.set(id, node);
      bumpNodeVersion((v) => v + 1);
    } else {
      nodesMapRef.current.delete(id);
    }
  }, []);

  const getNode = useCallback((id) => nodesMapRef.current.get(id) ?? null, []);

  const floorObjects = useMemo(() => {
    const result = [];
    for (const o of objects) {
      if (o.floorId !== activeFloorId) continue;
      if (!isValidPlacedObject(o)) {
        // eslint-disable-next-line no-console
        console.warn('[2D Editor] skipping malformed placed object:', o);
        continue;
      }
      result.push(o);
    }
    return result;
  }, [objects, activeFloorId]);

  // A safe fallback keeps every hook below unconditional (Rules of Hooks) even
  // before a building exists; the actual render bails out further down.
  const footprint = building?.footprint ?? { widthM: 10, depthM: 10 };
  const baseScale = computeFitScale(footprint, stageSize.width, stageSize.height);
  const scale = baseScale * viewport.zoom;
  const { offsetX: baseOffsetX, offsetY: baseOffsetY } = computeFootprintOffset(
    footprint,
    scale,
    stageSize.width,
    stageSize.height
  );
  const offsetX = baseOffsetX + viewport.pan.x;
  const offsetY = baseOffsetY + viewport.pan.y;

  const placement = useProductPlacement({ scale, offsetX, offsetY, activeFloorId });
  const copyDrag = useProductCopyDrag({
    getNode,
    scale,
    offsetX,
    offsetY,
    duplicateObjectAt,
    setSelectedIds,
    updateObjectPosition,
    ctrlRef,
  });

  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const singleSelectedObject = singleSelectedId
    ? objects.find((o) => o.id === singleSelectedId) ?? null
    : null;
  const singleSelectedNode = singleSelectedId ? getNode(singleSelectedId) : null;

  const viewerObject = viewerObjectId ? objects.find((o) => o.id === viewerObjectId) ?? null : null;

  function handleOpenViewer(id) {
    setDetailObjectId(null);
    setViewerObjectId(id);
  }

  function handleStagePointerMove(e) {
    placement.handleStagePointerMove(e);
    viewport.handleStagePointerMove(e);
  }

  const containerClassName = [
    'design-canvas',
    isPlacing ? 'is-placing' : '',
    viewport.isPanning ? 'is-panning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!building) return null;

  return (
    <div className={containerClassName} ref={containerRef}>
      {stageSize.width > 0 && (
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onPointerDown={viewport.handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={viewport.handleStagePointerUp}
          onPointerCancel={viewport.handleStagePointerCancel}
          onClick={placement.handleStageClick}
        >
          <Layer>
            <FootprintOutline
              footprint={building.footprint}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
            />
            {floorObjects.map((object) => (
              <PlacedObjectShape
                key={object.id}
                object={object}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                isSelected={selectedIds.includes(object.id)}
                draggable={!(selectedIds.length > 1 && selectedIds.includes(object.id))}
                placementModeActive={isPlacing}
                registerNodeRef={registerNodeRef}
                onSelect={(id, additive) => selectObject(id, { additive })}
                onDragStart={copyDrag.handleObjectDragStart}
                onDragEnd={copyDrag.handleObjectDragEnd}
                onOpenDetails={setDetailObjectId}
              />
            ))}
            {placement.isPlacing && placement.placingItem && (
              <PlacementPreview
                item={placement.placingItem}
                worldPos={placement.previewWorldPos}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
            )}
            <SelectionTransformer
              node={singleSelectedNode}
              selectedObject={singleSelectedObject}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              onCommit={updateObjectTransform}
            />
            <GroupDragProxy
              selectedIds={selectedIds}
              getNode={getNode}
              scale={scale}
              onDeltaMeters={(dx, dy) => applyDeltaToSelection(selectedIds, dx, dy)}
            />
          </Layer>
        </Stage>
      )}
      {detailObjectId && (
        <ObjectDetailModal
          objectId={detailObjectId}
          onClose={() => setDetailObjectId(null)}
          onOpenViewer={handleOpenViewer}
        />
      )}
      {viewerObject && (
        <ProductViewerModal
          product={viewerObject}
          onUpdate={(patch) => updateObjectDetails(viewerObject.id, patch)}
          onClose={() => setViewerObjectId(null)}
        />
      )}
    </div>
  );
}
