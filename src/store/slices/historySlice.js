import { saveImageBlob } from '../../services/imageStore';

const HISTORY_LIMIT = 50;

// Re-saves any image data present in a restored objects array back into
// IndexedDB. Deleting an object removes its stored image; undoing that
// deletion brings the in-memory object (and its imageDataUrl) straight back,
// but the IndexedDB entry stays gone unless we put it back here too —
// otherwise the image would silently vanish on the next page reload.
function resyncImages(objects) {
  objects.forEach((object) => {
    if (object.imageDataUrl) saveImageBlob(object.id, object.imageDataUrl);
  });
}

// Undo/redo covers `objects` only — layout data, not viewport pan/zoom or
// selection. Every action in objectsSlice that mutates `objects` calls
// pushHistorySnapshot() first to record what it looked like *before* the
// change; continuous-update gestures (multi-select group drag) call it once
// at the start of the gesture instead of on every intermediate frame.
export const createHistorySlice = (set, get) => ({
  past: [],
  future: [],

  pushHistorySnapshot: () => {
    const { objects, past } = get();
    set({
      past: [...past, objects].slice(-HISTORY_LIMIT),
      future: [],
    });
  },

  undo: () => {
    const { past, future, objects } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      objects: previous,
      past: past.slice(0, -1),
      future: [objects, ...future].slice(0, HISTORY_LIMIT),
      selectedIds: [],
    });
    resyncImages(previous);
  },

  redo: () => {
    const { past, future, objects } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      objects: next,
      past: [...past, objects].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selectedIds: [],
    });
    resyncImages(next);
  },
});
