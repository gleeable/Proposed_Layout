import { buildBuilding, MIN_FOOTPRINT_WIDTH_M, MIN_FOOTPRINT_DEPTH_M, MIN_BUILDING_HEIGHT_M } from '../../domain/building';
import { generateFloors } from '../../domain/floors';

export const createBuildingSlice = (set) => ({
  building: null,
  floors: [],

  generateBuilding: (params) => {
    const building = buildBuilding(params);
    const floors = generateFloors(building.floorCount, building.footprint);
    set({
      building,
      floors,
      objects: [],
      activeFloorId: floors[0]?.id ?? null,
      selectedFloorIds: floors[0]?.id ? [floors[0].id] : [],
      floorSelectionAnchorId: floors[0]?.id ?? null,
      selectedIds: [],
    });
  },

  resetBuilding: () => {
    set({
      building: null,
      floors: [],
      objects: [],
      activeFloorId: null,
      selectedFloorIds: [],
      floorSelectionAnchorId: null,
      selectedIds: [],
    });
  },

  // F7 layout-edit mode: lets the user directly override the footprint
  // dimensions a floor was generated with (normally derived from site area ×
  // coverage ratio, and shared by every floor at creation time). Applies to
  // whichever floors are selected in the floor panel (Ctrl/Shift multi-select),
  // falling back to just the active floor. Not part of undo/redo history —
  // like generateBuilding/resetBuilding, this changes floor geometry, not the
  // placed-object layout that history tracks.
  resizeFootprint: ({ widthM, depthM }) => set((state) => {
    if (!state.building) return {};
    const targetIds = state.selectedFloorIds?.length ? state.selectedFloorIds : [state.activeFloorId];
    return {
      floors: state.floors.map((floor) => {
        if (!targetIds.includes(floor.id)) return floor;
        const current = floor.footprint ?? state.building.footprint;
        return {
          ...floor,
          footprint: {
            widthM: widthM != null ? Math.max(MIN_FOOTPRINT_WIDTH_M, widthM) : current.widthM,
            depthM: depthM != null ? Math.max(MIN_FOOTPRINT_DEPTH_M, depthM) : current.depthM,
          },
        };
      }),
    };
  }),

  setBuildingHeight: (heightM) => set((state) => {
    if (!state.building || !Number.isFinite(heightM)) return {};
    return { building: { ...state.building, heightM: Math.max(MIN_BUILDING_HEIGHT_M, heightM) } };
  }),
});
