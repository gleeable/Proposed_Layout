import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';
import { computeFitScale, computeFootprintOffset } from './canvasGeometry';
import { FootprintOutline } from './FootprintOutline';
import { PlacedObjectShape } from './PlacedObjectShape';
import { SelectionTransformer } from './SelectionTransformer';
import { GroupDragProxy } from './GroupDragProxy';
import { ObjectDetailModal } from './ObjectDetailModal';
import './DesignCanvas.css';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;

export function DesignCanvas() {
  const containerRef = useRef(null);
  const nodesMapRef = useRef(new Map());
  const [, bumpNodeVersion] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [detailObjectId, setDetailObjectId] = useState(null);
  const [zoom, setZoom] = useState(1);

  const building = useAppStore((s) => s.building);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const objects = useAppStore((s) => s.objects);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectObject = useAppStore((s) => s.selectObject);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const updateObjectPosition = useAppStore((s) => s.updateObjectPosition);
  const updateObjectTransform = useAppStore((s) => s.updateObjectTransform);
  const applyDeltaToSelection = useAppStore((s) => s.applyDeltaToSelection);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    function handleWheel(e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => {
        const next = z * (1 - e.deltaY * 0.001);
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      });
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const state = useAppStore.getState();
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

  const floorObjects = useMemo(
    () => objects.filter((o) => o.floorId === activeFloorId),
    [objects, activeFloorId]
  );

  if (!building) return null;

  const scale = computeFitScale(building.footprint, stageSize.width, stageSize.height) * zoom;
  const { offsetX, offsetY } = computeFootprintOffset(
    building.footprint,
    scale,
    stageSize.width,
    stageSize.height
  );

  function handleStageMouseDown(e) {
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  }

  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const singleSelectedObject = singleSelectedId
    ? objects.find((o) => o.id === singleSelectedId) ?? null
    : null;
  const singleSelectedNode = singleSelectedId ? getNode(singleSelectedId) : null;

  return (
    <div className="design-canvas" ref={containerRef}>
      {stageSize.width > 0 && (
        <Stage width={stageSize.width} height={stageSize.height} onMouseDown={handleStageMouseDown}>
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
                registerNodeRef={registerNodeRef}
                onSelect={(id, additive) => selectObject(id, { additive })}
                onDragEnd={(id, xM, yM) => updateObjectPosition(id, xM, yM)}
                onOpenDetails={setDetailObjectId}
              />
            ))}
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
        <ObjectDetailModal objectId={detailObjectId} onClose={() => setDetailObjectId(null)} />
      )}
    </div>
  );
}
