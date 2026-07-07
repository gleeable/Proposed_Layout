import { buildBuilding } from '../../domain/building';
import { generateFloors } from '../../domain/floors';

export const createBuildingSlice = (set) => ({
  building: null,
  floors: [],

  generateBuilding: (params) => {
    const building = buildBuilding(params);
    const floors = generateFloors(building.floorCount);
    set({
      building,
      floors,
      objects: [],
      activeFloorId: floors[0]?.id ?? null,
      selectedIds: [],
    });
  },

  resetBuilding: () => {
    set({
      building: null,
      floors: [],
      objects: [],
      activeFloorId: null,
      selectedIds: [],
    });
  },
});
