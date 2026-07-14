import { useLayoutEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { normalizeTransform } from '../../domain/transform';
import { stagePxToMeters } from './canvasGeometry';

const MIN_BOX_PX = 12;
// While Ctrl/Cmd is held during a resize, each frame's box only moves this
// fraction of the way from where it was toward where the pointer says it
// should be — the box lags the cursor, so a large mouse movement only
// produces a small size change, giving fine-grained control.
const PRECISION_CATCH_UP = 0.15;

// A node can go away (deleted, moved to another floor, unmounted mid-drag)
// between when `node` was looked up for this render and when the Transformer
// actually tries to attach to it. Konva's Transformer.update() calls
// .setAttrs()/.getClientRect() on every attached node — if one has already
// been destroyed/detached that throws "Cannot read properties of undefined
// (reading 'setAttrs')" from inside a RAF-scheduled redraw, which is outside
// React's call stack and therefore invisible to CanvasErrorBoundary. Always
// verify the node is still live immediately before handing it to Transformer,
// and do it in a layout effect so it runs synchronously right after commit
// rather than after paint.
function isNodeAttachable(node) {
  if (!node) return false;
  if (typeof node.isDestroyed === 'function' && node.isDestroyed()) return false;
  return Boolean(node.getStage());
}

export function SelectionTransformer({ node, selectedObject, scale, offsetX, offsetY, onCommit, ctrlRef }) {
  const trRef = useRef(null);

  useLayoutEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;
    transformer.nodes(isNodeAttachable(node) ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [node]);

  function handleTransformEnd() {
    if (!isNodeAttachable(node) || !selectedObject) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const x = stagePxToMeters(node.x() - offsetX, scale);
    const y = stagePxToMeters(node.y() - offsetY, scale);

    const normalized = normalizeTransform({
      x,
      y,
      width: selectedObject.width,
      height: selectedObject.height,
      scaleX,
      scaleY,
      rotation,
    });

    node.scaleX(1);
    node.scaleY(1);
    onCommit(selectedObject.id, normalized);
  }

  if (!node) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < MIN_BOX_PX || Math.abs(newBox.height) < MIN_BOX_PX) return oldBox;
        if (!ctrlRef?.current) return newBox;
        return {
          ...newBox,
          x: oldBox.x + (newBox.x - oldBox.x) * PRECISION_CATCH_UP,
          y: oldBox.y + (newBox.y - oldBox.y) * PRECISION_CATCH_UP,
          width: oldBox.width + (newBox.width - oldBox.width) * PRECISION_CATCH_UP,
          height: oldBox.height + (newBox.height - oldBox.height) * PRECISION_CATCH_UP,
        };
      }}
      onTransformEnd={handleTransformEnd}
    />
  );
}
