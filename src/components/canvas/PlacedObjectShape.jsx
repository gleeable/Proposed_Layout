import { useCallback } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { metersToStagePx, stagePxToMeters } from './canvasGeometry';
import { FacilityIcon, SHAPED_FACILITY_CATEGORIES } from './FacilityIcon';

export function PlacedObjectShape({
  object,
  scale,
  offsetX,
  offsetY,
  isSelected,
  draggable,
  placementModeActive,
  registerNodeRef,
  onSelect,
  onDragStart,
  onDragEnd,
  onOpenDetails,
  onContextMenu,
}) {
  const { id, x, y, width, height, rotation, flipX, flipY, fill, label, imageDataUrl, kind, category } = object;
  const [image] = useImage(imageDataUrl || '');
  const showLabel = kind !== 'product';
  const hasShapedIcon = !imageDataUrl && SHAPED_FACILITY_CATEGORIES.has(category);

  // Must stay referentially stable across renders — a fresh closure here makes React
  // detach/reattach the ref every render, and registerNodeRef's setState would loop forever.
  const handleRef = useCallback((node) => registerNodeRef(id, node), [id, registerNodeRef]);

  const pxX = offsetX + metersToStagePx(x, scale);
  const pxY = offsetY + metersToStagePx(y, scale);
  const pxW = metersToStagePx(width, scale);
  const pxH = metersToStagePx(height, scale);
  const flipScaleX = flipX ? -1 : 1;
  const flipScaleY = flipY ? -1 : 1;

  function handleSelect(evt) {
    // While placing a new product, clicks should bubble up to the stage and
    // confirm the placement instead of selecting whatever is underneath.
    if (placementModeActive) return;
    // Right-click is handled by handleContextMenu instead — falling through
    // here would collapse an existing multi-selection back down to just this
    // object (non-additive select) before the context menu logic ever runs.
    if (evt.evt.button === 2) return;
    evt.cancelBubble = true;
    const additive = Boolean(evt.evt.shiftKey || evt.evt.ctrlKey || evt.evt.metaKey);
    onSelect(id, additive);
    if (!additive) {
      onOpenDetails(id);
    }
  }

  function handleContextMenu(evt) {
    if (placementModeActive) return;
    evt.evt.preventDefault();
    evt.cancelBubble = true;
    onContextMenu?.(id);
  }

  function handleDragStart(evt) {
    onDragStart?.(id, object, evt);
  }

  function handleDragEnd(evt) {
    const node = evt.target;
    const xMeters = stagePxToMeters(node.x() - offsetX, scale);
    const yMeters = stagePxToMeters(node.y() - offsetY, scale);
    onDragEnd(id, object, xMeters, yMeters);
  }

  return (
    <Group
      ref={handleRef}
      x={pxX}
      y={pxY}
      rotation={rotation}
      draggable={draggable && !placementModeActive}
      onClick={handleSelect}
      onTap={handleSelect}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Group scaleX={flipScaleX} scaleY={flipScaleY}>
        {imageDataUrl && image ? (
          <KonvaImage
            image={image}
            x={-pxW / 2}
            y={-pxH / 2}
            width={pxW}
            height={pxH}
            stroke={isSelected ? '#4338ca' : '#9ca3af'}
            strokeWidth={isSelected ? 2 : 1}
          />
        ) : hasShapedIcon ? (
          <FacilityIcon category={category} pxW={pxW} pxH={pxH} fill={fill} isSelected={isSelected} />
        ) : (
          <Rect
            x={-pxW / 2}
            y={-pxH / 2}
            width={pxW}
            height={pxH}
            fill={fill || '#93C5FD'}
            stroke={isSelected ? '#4338ca' : '#9ca3af'}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={3}
          />
        )}
        {showLabel && (
          <Group scaleX={flipScaleX} scaleY={flipScaleY}>
            <Text
              text={label}
              x={-pxW / 2}
              y={-pxH / 2}
              width={pxW}
              height={pxH}
              align="center"
              verticalAlign="middle"
              fontSize={11}
              fill="#111827"
              listening={false}
            />
          </Group>
        )}
      </Group>
    </Group>
  );
}
