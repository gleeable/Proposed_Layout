import { useLayoutEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { normalizeTransform } from '../../domain/transform';
import { stagePxToMeters } from './canvasGeometry';

const MIN_BOX_PX = 12;

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

export function SelectionTransformer({ node, selectedObject, scale, offsetX, offsetY, onCommit }) {
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
      boundBoxFunc={(oldBox, newBox) => (
        Math.abs(newBox.width) < MIN_BOX_PX || Math.abs(newBox.height) < MIN_BOX_PX ? oldBox : newBox
      )}
      onTransformEnd={handleTransformEnd}
    />
  );
}
