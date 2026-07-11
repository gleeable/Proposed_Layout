import { buildBuilding, MIN_FOOTPRINT_WIDTH_M, MIN_FOOTPRINT_DEPTH_M, MIN_BUILDING_HEIGHT_M } from '../../domain/building';
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

  // F7 layout-edit mode: lets the user directly override the footprint
  // dimensions the building was generated with (normally derived from
  // site area × coverage ratio). Not part of undo/redo history — like
  // generateBuilding/resetBuilding, this changes the building itself, not
  // the placed-object layout that history tracks.
  resizeFootprint: ({ widthM, depthM }) => set((state) => {
    if (!state.building) return {};
    return {
      building: {
        ...state.building,
        footprint: {
          widthM: widthM != null ? Math.max(MIN_FOOTPRINT_WIDTH_M, widthM) : state.building.footprint.widthM,
          depthM: depthM != null ? Math.max(MIN_FOOTPRINT_DEPTH_M, depthM) : state.building.footprint.depthM,
        },
      },
    };
  }),

  setBuildingHeight: (heightM) => set((state) => {
    if (!state.building || !Number.isFinite(heightM)) return {};
    return { building: { ...state.building, heightM: Math.max(MIN_BUILDING_HEIGHT_M, heightM) } };
  }),
});
