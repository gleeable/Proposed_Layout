import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';
import { computeFitScale, computeFootprintOffset } from './canvasGeometry';
import { FootprintOutline } from './FootprintOutline';
import { FootprintDimensions } from './FootprintDimensions';
import { FootprintResizeHandles } from './FootprintResizeHandles';
import { PlacedObjectShape } from './PlacedObjectShape';
import { PlacementPreview } from './PlacementPreview';
import { SelectionTransformer } from './SelectionTransformer';
import { GroupDragProxy } from './GroupDragProxy';
import { ObjectDetailModal } from './ObjectDetailModal';
import { SelectionActionMenu } from './SelectionActionMenu';
import { ProductViewerModal } from '../productViewer/ProductViewerModal';
import { useCanvasViewport } from './useCanvasViewport';
import { useMarqueeSelection } from './useMarqueeSelection';
import { useProductPlacement } from './useProductPlacement';
import { useProductCopyDrag } from './useProductCopyDrag';
import { useKeyboardModifiers } from './useKeyboardModifiers';
import { useRulerTool } from './useRulerTool';
import { RulerOverlay } from './RulerOverlay';
import './DesignCanvas.css';

const ARROW_MOVE_STEP_M = 0.1;
const ARROW_MOVE_STEP_FINE_M = 0.01;
const ARROW_KEY_DELTAS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

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
  const [contextMenu, setContextMenu] = useState(null);

  const building = useAppStore((s) => s.building);
  const floors = useAppStore((s) => s.floors);
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
  const pushHistorySnapshot = useAppStore((s) => s.pushHistorySnapshot);
  const duplicateObjectAt = useAppStore((s) => s.duplicateObjectAt);
  const duplicateSelectionBy = useAppStore((s) => s.duplicateSelectionBy);
  const placingCatalogItemId = useAppStore((s) => s.placingCatalogItemId);
  const isEditingLayout = useAppStore((s) => s.isEditingLayout);
  const resizeFootprint = useAppStore((s) => s.resizeFootprint);
  const isRulerActive = useAppStore((s) => s.isRulerActive);

  const isPlacing = Boolean(placingCatalogItemId);
  const { ctrlRef } = useKeyboardModifiers();

  // Defense in depth: every action that removes/relocates objects already
  // clears selectedIds in the same store update, but if any path ever
  // doesn't, a selectedId with no matching object would hand
  // SelectionTransformer a dangling Konva node reference — drop it here too.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const objectIds = new Set(objects.map((o) => o.id));
    const stale = selectedIds.filter((id) => !objectIds.has(id));
    if (stale.length > 0) {
      setSelectedIds(selectedIds.filter((id) => objectIds.has(id)));
    }
  }, [objects, selectedIds, setSelectedIds]);

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
  });

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const state = useAppStore.getState();
      if (state.placingCatalogItemId) return; // placement mode owns keyboard input (Escape) elsewhere

      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        state.redo();
        return;
      }

      if (e.key.toLowerCase() === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const newIds = state.pasteClipboard();
        if (newIds?.length) state.setSelectedIds(newIds);
        return;
      }

      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        state.toggleRulerMode();
        return;
      }

      if (state.selectedIds.length === 0) return;

      const arrowDelta = ARROW_KEY_DELTAS[e.key];
      if (arrowDelta) {
        e.preventDefault();
        const step = e.ctrlKey || e.metaKey ? ARROW_MOVE_STEP_FINE_M : ARROW_MOVE_STEP_M;
        // e.repeat is true for OS-generated auto-repeat while the key stays
        // held — treat "holding the key down" as one undo-able gesture
        // rather than pushing a snapshot per repeat tick.
        if (!e.repeat) state.pushHistorySnapshot();
        state.applyDeltaToSelection(state.selectedIds, arrowDelta.dx * step, arrowDelta.dy * step);
        return;
      }

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
      } else if (e.key.toLowerCase() === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        state.copySelection(state.selectedIds);
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

  const marquee = useMarqueeSelection({
    disabled: isPlacing || isRulerActive,
    objects: floorObjects,
    getNode,
    setSelectedIds,
    clearSelection,
  });

  // A safe fallback keeps every hook below unconditional (Rules of Hooks) even
  // before a building exists; the actual render bails out further down.
  // Each floor can have its own footprint (F7 edit mode) — fall back to the
  // building's shared footprint for older saves that predate per-floor sizes.
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const footprint = activeFloor?.footprint ?? building?.footprint ?? { widthM: 10, depthM: 10 };
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
  const ruler = useRulerTool({ scale, offsetX, offsetY, ctrlRef });
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

  function handleObjectContextMenu(id, evt) {
    // Right-clicking a member of an existing multi-selection opens the bulk
    // action menu; right-clicking a lone/ungrouped object is a no-op (native
    // context menu is already suppressed in PlacedObjectShape).
    if (selectedIds.length >= 2 && selectedIds.includes(id)) {
      setContextMenu({ x: evt.clientX, y: evt.clientY, ids: selectedIds });
    }
  }

  function handleStagePointerMove(e) {
    placement.handleStagePointerMove(e);
    marquee.handleStagePointerMove(e);
    ruler.handleStagePointerMove(e);
  }

  function handleStageClick(e) {
    if (placement.handleStageClick(e)) return;
    ruler.handleStageClick(e);
  }

  function handleStageContextMenu(e) {
    if (ruler.handleStageContextMenu(e)) e.evt.preventDefault();
  }

  const containerClassName = [
    'design-canvas',
    isPlacing ? 'is-placing' : '',
    isRulerActive ? 'is-measuring' : '',
    marquee.marqueeRect ? 'is-marquee-selecting' : '',
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
          onPointerDown={marquee.handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={marquee.handleStagePointerUp}
          onPointerCancel={marquee.handleStagePointerCancel}
          onClick={handleStageClick}
          onContextMenu={handleStageContextMenu}
        >
          <Layer>
            <FootprintOutline
              footprint={footprint}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
            />
            <FootprintDimensions
              footprint={footprint}
              heightM={building.heightM}
              floorCount={building.floorCount}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
            />
            {isEditingLayout && (
              <FootprintResizeHandles
                footprint={footprint}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                onResize={resizeFootprint}
              />
            )}
            {floorObjects.map((object) => (
              <PlacedObjectShape
                key={object.id}
                object={object}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                isSelected={selectedIds.includes(object.id)}
                draggable={!(selectedIds.length > 1 && selectedIds.includes(object.id))}
                placementModeActive={isPlacing || isRulerActive}
                registerNodeRef={registerNodeRef}
                onSelect={(id, additive) => selectObject(id, { additive })}
                onDragStart={copyDrag.handleObjectDragStart}
                onDragEnd={copyDrag.handleObjectDragEnd}
                onOpenDetails={setDetailObjectId}
                onContextMenu={handleObjectContextMenu}
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
              ctrlRef={ctrlRef}
            />
            <GroupDragProxy
              selectedIds={selectedIds}
              getNode={getNode}
              scale={scale}
              onDeltaMeters={(dx, dy) => applyDeltaToSelection(selectedIds, dx, dy)}
              onDragBegin={pushHistorySnapshot}
              onDuplicateBy={duplicateSelectionBy}
              setSelectedIds={setSelectedIds}
              ctrlRef={ctrlRef}
              onContextMenu={(evt) => setContextMenu({ x: evt.clientX, y: evt.clientY, ids: selectedIds })}
            />
            {marquee.marqueeRect && (
              <Rect
                x={marquee.marqueeRect.x}
                y={marquee.marqueeRect.y}
                width={marquee.marqueeRect.width}
                height={marquee.marqueeRect.height}
                stroke="#2563eb"
                dash={[4, 4]}
                fill="rgba(37,99,235,0.08)"
                listening={false}
              />
            )}
            <RulerOverlay
              segments={ruler.segments}
              pendingStart={ruler.pendingStart}
              previewPoint={ruler.previewPoint}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
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
      {contextMenu && (
        <SelectionActionMenu
          ids={contextMenu.ids}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
