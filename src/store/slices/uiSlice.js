export const createUiSlice = (set, get) => ({
  activeTab: 'design',
  selectedIds: [],
  canvasViewMode: '2d',
  placingCatalogItemId: null,
  isEditingLayout: false,
  isRulerActive: false,
  isFirstPersonMode: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCanvasViewMode: (mode) => set({ canvasViewMode: mode }),

  // F7 toggles this. Turning it on also forces the 2D plan view, since the
  // resize handles/dimension drag only make sense there — turning it off
  // leaves whatever view the user is already on alone.
  toggleEditingLayout: () => set((state) => {
    const next = !state.isEditingLayout;
    return { isEditingLayout: next, canvasViewMode: next ? '2d' : state.canvasViewMode };
  }),

  startPlacingProduct: (catalogItemId) => {
    set((state) => ({
      placingCatalogItemId: state.placingCatalogItemId === catalogItemId ? null : catalogItemId,
    }));
  },

  cancelPlacingProduct: () => set({ placingCatalogItemId: null }),

  // Turning the ruler on clears selection so the Transformer handles don't
  // clutter the canvas while measuring; turning it off is handled by the
  // ruler hook itself, which drops its measured segments on deactivation.
  toggleRulerMode: () => set((state) => {
    const next = !state.isRulerActive;
    return { isRulerActive: next, selectedIds: next ? [] : state.selectedIds };
  }),

  toggleFirstPersonMode: () => set((state) => ({ isFirstPersonMode: !state.isFirstPersonMode })),

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
