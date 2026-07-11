import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createBuildingSlice } from './slices/buildingSlice';
import { createFloorsSlice } from './slices/floorsSlice';
import { createObjectsSlice } from './slices/objectsSlice';
import { createUiSlice } from './slices/uiSlice';
import { createCatalogSlice } from './slices/catalogSlice';
import { safePersistStorage } from '../services/persistStorage';
import { emitStorageEvent, clearHydrationError } from '../services/storageEvents';
import { stripImagesFromState, extractEmbeddedImages, restoreImagesIntoState } from './imagePersistence';

export const useAppStore = create(
  persist(
    (...args) => ({
      ...createBuildingSlice(...args),
      ...createFloorsSlice(...args),
      ...createObjectsSlice(...args),
      ...createUiSlice(...args),
      ...createCatalogSlice(...args),
    }),
    {
      name: 'space-layout-app',
      // v1 -> v2: imageDataUrl (base64) moved out of localStorage into
      // IndexedDB (see imagePersistence.js) — this is what was blowing the
      // storage quota. Bumping the version routes existing users through
      // `migrate` below instead of silently reinterpreting old data.
      version: 2,
      storage: createJSONStorage(() => safePersistStorage),
      // Selection, drag/pan/placement state, keyboard modifiers, etc. are
      // deliberately NOT listed here — they're transient UI state, not
      // layout data, and persisting them was making every select/deselect
      // rewrite the (image-bloated) full state to localStorage.
      partialize: (state) => stripImagesFromState({
        building: state.building,
        floors: state.floors,
        objects: state.objects,
        activeFloorId: state.activeFloorId,
        activeTab: state.activeTab,
        catalogItems: state.catalogItems,
      }),
      migrate: async (persistedState, version) => {
        if (version < 2) {
          return extractEmbeddedImages(persistedState);
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error('[useAppStore] failed to load persisted layout data', error);
          emitStorageEvent({ type: 'hydration-error', error });
          return;
        }
        clearHydrationError();
        if (!state) return;
        // zustand's persist hydration runs fully synchronously when the
        // underlying storage is synchronous (ours is) — this callback can
        // fire *during* the create(...) call below, before the `useAppStore`
        // binding it closes over has actually been assigned. Deferring by a
        // microtask lets that assignment finish first.
        queueMicrotask(() => {
          restoreImagesIntoState(useAppStore.getState, useAppStore.setState).catch((restoreError) => {
            // eslint-disable-next-line no-console
            console.error('[useAppStore] failed to restore images from IndexedDB', restoreError);
          });
        });
      },
    }
  )
);
