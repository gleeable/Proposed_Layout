import { createId } from '../../domain/ids';
import { saveImageBlob, deleteImageBlob } from '../../services/imageStore';

export const createMaterialsSlice = (set, get) => ({
  customMaterials: [],
  wallMaterialId: null,
  floorMaterialId: null,

  setWallMaterial: (materialId) => set({ wallMaterialId: materialId }),
  setFloorMaterial: (materialId) => set({ floorMaterialId: materialId }),

  addCustomMaterial: ({ category, label, imageDataUrl }) => {
    const newMaterial = {
      id: createId(),
      category,
      label,
      imageDataUrl,
      createdAt: Date.now(),
    };
    set({ customMaterials: [...get().customMaterials, newMaterial] });
    saveImageBlob(newMaterial.id, imageDataUrl);
    return newMaterial.id;
  },

  removeCustomMaterial: (id) => {
    const { wallMaterialId, floorMaterialId } = get();
    set({
      customMaterials: get().customMaterials.filter((m) => m.id !== id),
      wallMaterialId: wallMaterialId === id ? null : wallMaterialId,
      floorMaterialId: floorMaterialId === id ? null : floorMaterialId,
    });
    deleteImageBlob(id);
  },
});
