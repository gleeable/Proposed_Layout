import { emitStorageEvent } from './storageEvents';

// zustand's persist middleware calls `api.setState` -> `storage.setItem`
// synchronously, inline with whatever action triggered the state change
// (selectObject, updateObjectPosition, a Konva dragend handler, ...). A
// throw from in here propagates out through that action and out through
// the Konva/React event-handler call stack — and React error boundaries do
// NOT catch errors thrown from inside event handlers, only from
// render/lifecycle. That's why a quota overflow here used to take down the
// whole editor as a blank screen instead of being caught by
// CanvasErrorBoundary. So: never throw out of this module, for anything.
const WRITE_DEBOUNCE_MS = 400;
const WARN_SIZE_BYTES = 1024 * 1024;

const pendingWrites = new Map();

function isQuotaExceeded(error) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  );
}

function logSizeInDev(name, value) {
  if (!import.meta.env?.DEV) return;
  const bytes = new Blob([value]).size;
  const megabytes = bytes / 1024 / 1024;
  if (bytes > WARN_SIZE_BYTES) {
    // eslint-disable-next-line no-console
    console.warn(`[persistStorage] ${name} storage size: ${megabytes.toFixed(2)} MB (over 1MB)`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[persistStorage] ${name} storage size: ${megabytes.toFixed(2)} MB`);
  }
}

function writeNow(name, value) {
  logSizeInDev(name, value);
  try {
    window.localStorage.setItem(name, value);
    emitStorageEvent({ type: 'write-ok', name });
  } catch (error) {
    if (isQuotaExceeded(error)) {
      const bytes = new Blob([value]).size;
      // eslint-disable-next-line no-console
      console.error('[persistStorage] localStorage quota exceeded', { name, size: bytes, error });
      emitStorageEvent({ type: 'quota-exceeded', name, size: bytes });
    } else {
      // eslint-disable-next-line no-console
      console.error('[persistStorage] localStorage write failed', { name, error });
      emitStorageEvent({ type: 'write-error', name, error });
    }
  }
}

// Coalesces rapid successive writes (e.g. a multi-select group drag firing
// on every pointer move) into a single actual localStorage write once
// things settle, instead of hitting disk/quota on every frame.
export const safePersistStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[persistStorage] localStorage read failed', { name, error });
      emitStorageEvent({ type: 'read-error', name, error });
      return null;
    }
  },
  setItem: (name, value) => {
    const existing = pendingWrites.get(name);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      pendingWrites.delete(name);
      writeNow(name, value);
    }, WRITE_DEBOUNCE_MS);
    pendingWrites.set(name, { timer, value });
  },
  removeItem: (name) => {
    const existing = pendingWrites.get(name);
    if (existing) {
      clearTimeout(existing.timer);
      pendingWrites.delete(name);
    }
    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[persistStorage] localStorage removeItem failed', { name, error });
    }
  },
};

// Flushes a debounced write immediately (used before "download backup", so
// the backup reflects the latest in-memory state rather than whatever's
// already on disk from before the debounce window elapsed).
export function flushPendingWrite(name) {
  const existing = pendingWrites.get(name);
  if (!existing) return;
  clearTimeout(existing.timer);
  pendingWrites.delete(name);
  writeNow(name, existing.value);
}
