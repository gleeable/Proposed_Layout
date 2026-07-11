import { useEffect, useRef, useState } from 'react';

const CLICK_THRESHOLD_PX = 4;

// Drag-on-empty-space marquee select: draws a rectangle and, on release,
// selects every object whose full footprint (all sides) lies inside it —
// a partial overlap does not count. A drag that never moved is treated as
// a plain empty click (clears the selection), matching the old behavior.
export function useMarqueeSelection({ disabled, objects, getNode, setSelectedIds, clearSelection }) {
  const [marquee, setMarquee] = useState(null);
  const marqueeRef = useRef(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    function abort() {
      if (!marqueeRef.current) return;
      marqueeRef.current = null;
      setMarquee(null);
    }
    window.addEventListener('blur', abort);
    document.addEventListener('visibilitychange', abort);
    return () => {
      window.removeEventListener('blur', abort);
      document.removeEventListener('visibilitychange', abort);
    };
  }, []);

  function handleStagePointerDown(e) {
    if (disabledRef.current) return;
    const stage = e.target.getStage();
    if (e.target !== stage) return; // a shape was hit — let its own handlers deal with it

    const pos = stage.getPointerPosition();
    if (!pos) return;
    const evt = e.evt;
    if (typeof evt.pointerId === 'number') {
      try {
        // Capture on stage.content (where Konva's own listeners live), not
        // stage.container() (content's parent) — capturing on an ancestor
        // retargets subsequent events there, and since content is a *child*
        // it falls outside that target's bubble path, so Konva would never
        // see another pointermove/pointerup for the rest of the drag.
        stage.content.setPointerCapture(evt.pointerId);
      } catch {
        // pointer capture isn't available in every environment — selection still works
      }
    }
    const next = { pointerId: evt.pointerId, startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y, moved: false };
    marqueeRef.current = next;
    setMarquee(next);
  }

  function handleStagePointerMove(e) {
    const m = marqueeRef.current;
    if (!m) return;
    const stage = e.target.getStage ? e.target.getStage() : null;
    const pos = stage ? stage.getPointerPosition() : null;
    if (!pos) return;
    if (!m.moved && Math.hypot(pos.x - m.startX, pos.y - m.startY) > CLICK_THRESHOLD_PX) {
      m.moved = true;
    }
    const next = { ...m, curX: pos.x, curY: pos.y };
    marqueeRef.current = next;
    setMarquee(next);
  }

  function finalize(e, { treatAsClick }) {
    const m = marqueeRef.current;
    if (!m) return;
    if (typeof m.pointerId === 'number') {
      try {
        e.target.getStage()?.content.releasePointerCapture(m.pointerId);
      } catch {
        // no-op — capture may already have been released
      }
    }
    marqueeRef.current = null;
    setMarquee(null);

    if (!m.moved) {
      if (treatAsClick) clearSelection?.();
      return;
    }
    if (!treatAsClick) return;

    const x1 = Math.min(m.startX, m.curX);
    const y1 = Math.min(m.startY, m.curY);
    const x2 = Math.max(m.startX, m.curX);
    const y2 = Math.max(m.startY, m.curY);

    const matched = objects
      .map((o) => ({ id: o.id, node: getNode(o.id) }))
      .filter(({ node }) => node)
      .filter(({ node }) => {
        const r = node.getClientRect();
        return r.x >= x1 && r.y >= y1 && r.x + r.width <= x2 && r.y + r.height <= y2;
      })
      .map(({ id }) => id);
    setSelectedIds(matched);
  }

  function handleStagePointerUp(e) {
    finalize(e, { treatAsClick: true });
  }

  function handleStagePointerCancel(e) {
    finalize(e, { treatAsClick: false });
  }

  const rect = marquee
    ? {
        x: Math.min(marquee.startX, marquee.curX),
        y: Math.min(marquee.startY, marquee.curY),
        width: Math.abs(marquee.curX - marquee.startX),
        height: Math.abs(marquee.curY - marquee.startY),
      }
    : null;

  return {
    marqueeRect: marquee?.moved ? rect : null,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
  };
}
