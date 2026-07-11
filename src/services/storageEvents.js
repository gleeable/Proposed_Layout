// Plain pub/sub, deliberately independent of the zustand store: storage
// failures (quota exceeded, corrupted persisted JSON) must still be able to
// reach the UI even if the store itself is the thing having trouble.
//
// zustand's persist hydration runs synchronously at module-load time, before
// React has even rendered — so a hydration-error can fire and be gone before
// any component's useEffect gets a chance to subscribe. Remember the latest
// one and replay it to late subscribers so the recovery UI still shows up.
const listeners = new Set();
let lastHydrationError = null;

export function onStorageEvent(callback) {
  listeners.add(callback);
  if (lastHydrationError) callback({ type: 'hydration-error', error: lastHydrationError });
  return () => listeners.delete(callback);
}

export function emitStorageEvent(event) {
  if (event.type === 'hydration-error') lastHydrationError = event.error;
  listeners.forEach((callback) => callback(event));
}

export function clearHydrationError() {
  lastHydrationError = null;
}
