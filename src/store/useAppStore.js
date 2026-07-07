import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createBuildingSlice } from './slices/buildingSlice';
import { createFloorsSlice } from './slices/floorsSlice';
import { createObjectsSlice } from './slices/objectsSlice';
import { createUiSlice } from './slices/uiSlice';

export const useAppStore = create(
  persist(
    (...args) => ({
      ...createBuildingSlice(...args),
      ...createFloorsSlice(...args),
      ...createObjectsSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: 'space-layout-app',
      version: 1,
      partialize: (state) => ({
        building: state.building,
        floors: state.floors,
        objects: state.objects,
        activeFloorId: state.activeFloorId,
        activeTab: state.activeTab,
      }),
    }
  )
);
