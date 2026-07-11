import { getDefaultMaterial } from '../domain/materialCatalog';
import { renderMaterialThumbnail } from './materialTexture';

// A material id is either one of the built-in swatches (rendered
// procedurally, see materialTexture.js) or a user-requested one stored in
// the app store's customMaterials — this resolves either to a single
// displayable image, used for both palette thumbnails and 3D textures.
export function resolveMaterialImage(materialId, customMaterials) {
  if (!materialId) return null;
  const builtin = getDefaultMaterial(materialId);
  if (builtin) return renderMaterialThumbnail(builtin);
  const custom = (customMaterials || []).find((m) => m.id === materialId);
  return custom?.imageDataUrl || null;
}

export function resolveMaterialLabel(materialId, customMaterials) {
  if (!materialId) return null;
  const builtin = getDefaultMaterial(materialId);
  if (builtin) return builtin.label;
  const custom = (customMaterials || []).find((m) => m.id === materialId);
  return custom?.label || null;
}
