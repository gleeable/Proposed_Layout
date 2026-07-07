export const createUiSlice = (set, get) => ({
  activeTab: 'design',
  selectedIds: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearSelection: () => set({ selectedIds: [] }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  selectObject: (id, { additive = false } = {}) => {
    const { objects, selectedIds } = get();
    const target = objects.find((o) => o.id === id);
    if (!target) return;

    if (additive) {
      set({
        selectedIds: selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id],
      });
      return;
    }

    const siblingIds = target.groupId
      ? objects.filter((o) => o.groupId === target.groupId).map((o) => o.id)
      : [id];
    set({ selectedIds: siblingIds });
  },
});
