import { createId } from '../../domain/ids';

export const createCatalogSlice = (set, get) => ({
  catalogItems: [],

  addPhotoProduct: ({ label, imageDataUrl }) => {
    const newItem = {
      id: createId(),
      source: 'photo',
      label,
      imageDataUrl,
      createdAt: Date.now(),
    };
    set({ catalogItems: [...get().catalogItems, newItem] });
    return newItem.id;
  },

  addGeneratedProduct: ({ label, imageDataUrl = null, modelUrl = null }) => {
    const newItem = {
      id: createId(),
      source: 'generated',
      label,
      imageDataUrl,
      modelUrl,
      createdAt: Date.now(),
    };
    set({ catalogItems: [...get().catalogItems, newItem] });
    return newItem.id;
  },

  removeCatalogItem: (id) => {
    set({ catalogItems: get().catalogItems.filter((item) => item.id !== id) });
  },
});
