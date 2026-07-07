import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { normalizeTransform } from '../../domain/transform';
import { stagePxToMeters } from './canvasGeometry';

const MIN_BOX_PX = 12;

export function SelectionTransformer({ node, selectedObject, scale, offsetX, offsetY, onCommit }) {
  const trRef = useRef(null);

  useEffect(() => {
    if (!trRef.current) return;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [node]);

  function handleTransformEnd() {
    if (!node || !selectedObject) return;
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
