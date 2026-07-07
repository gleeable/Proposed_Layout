export const createFloorsSlice = (set) => ({
  activeFloorId: null,

  setActiveFloor: (floorId) => set({ activeFloorId: floorId, selectedIds: [] }),
});
