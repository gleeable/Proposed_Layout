import { createId } from '../../domain/ids';

const DEFAULT_VERTICAL_HEIGHT_MM = 800;
const DEFAULT_PRODUCT_SIZE_M = 1;

function emptyProductDetails() {
  return {
    brand: '',
    material: '',
    color: '',
    manufacturer: '',
    link: '',
    memo: '',
    width: DEFAULT_PRODUCT_SIZE_M,
    height: DEFAULT_PRODUCT_SIZE_M,
    verticalHeightMm: DEFAULT_VERTICAL_HEIGHT_MM,
  };
}

export const createCatalogSlice = (set, get) => ({
  catalogItems: [],

  addPhotoProduct: ({ label, imageDataUrl }) => {
    const newItem = {
      id: createId(),
      source: 'photo',
      label,
      imageDataUrl,
      modelUrl: null,
      createdAt: Date.now(),
      ...emptyProductDetails(),
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
      ...emptyProductDetails(),
    };
    set({ catalogItems: [...get().catalogItems, newItem] });
    return newItem.id;
  },

  updateCatalogItemDetails: (id, patch) => {
    set({
      catalogItems: get().catalogItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  },

  removeCatalogItem: (id) => {
    set({ catalogItems: get().catalogItems.filter((item) => item.id !== id) });
  },
});
