import { createId } from '../../domain/ids';
import { saveImageBlob, deleteImageBlob } from '../../services/imageStore';

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

  addPhotoProduct: ({ label, imageDataUrl, modelUrl = null }) => {
    const newItem = {
      id: createId(),
      source: 'photo',
      label,
      imageDataUrl,
      modelUrl,
      createdAt: Date.now(),
      ...emptyProductDetails(),
    };
    set({ catalogItems: [...get().catalogItems, newItem] });
    saveImageBlob(newItem.id, imageDataUrl);
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
    if (imageDataUrl) saveImageBlob(newItem.id, imageDataUrl);
    return newItem.id;
  },

  updateCatalogItemDetails: (id, patch) => {
    set({
      catalogItems: get().catalogItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
    if (patch.imageDataUrl) saveImageBlob(id, patch.imageDataUrl);
  },

  removeCatalogItem: (id) => {
    set({ catalogItems: get().catalogItems.filter((item) => item.id !== id) });
    deleteImageBlob(id);
  },
});
