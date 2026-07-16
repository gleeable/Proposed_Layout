export const createFloorsSlice = (set, get) => ({
  activeFloorId: null,
  // Which floors a bulk action (F7 dimension edit) applies to. Defaults to
  // just the active floor; Ctrl/Shift+click in the floor panel can grow this
  // to include other floors.
  selectedFloorIds: [],
  // The floor a Shift+click range is measured from — the last floor clicked
  // without Shift held.
  floorSelectionAnchorId: null,

  setActiveFloor: (floorId, { additive = false, range = false } = {}) => {
    const { floors, floorSelectionAnchorId } = get();

    if (range && floorSelectionAnchorId) {
      const anchor = floors.find((f) => f.id === floorSelectionAnchorId);
      const target = floors.find((f) => f.id === floorId);
      if (anchor && target) {
        const [lo, hi] = anchor.index <= target.index
          ? [anchor.index, target.index]
          : [target.index, anchor.index];
        const rangeIds = floors.filter((f) => f.index >= lo && f.index <= hi).map((f) => f.id);
        set({ activeFloorId: floorId, selectedFloorIds: rangeIds, selectedIds: [] });
        return;
      }
    }

    if (additive) {
      const { selectedFloorIds } = get();
      const next = selectedFloorIds.includes(floorId)
        ? selectedFloorIds.filter((id) => id !== floorId)
        : [...selectedFloorIds, floorId];
      set({
        activeFloorId: floorId,
        selectedFloorIds: next.length ? next : [floorId],
        floorSelectionAnchorId: floorId,
        selectedIds: [],
      });
      return;
    }

    set({
      activeFloorId: floorId,
      selectedFloorIds: [floorId],
      floorSelectionAnchorId: floorId,
      selectedIds: [],
    });
  },
});
