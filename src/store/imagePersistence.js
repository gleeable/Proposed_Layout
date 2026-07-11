import { getImageBlobs, saveImageBlob } from '../services/imageStore';

function stripImageDataUrl(item) {
  if (!item || !item.imageDataUrl) return item;
  const { imageDataUrl, ...rest } = item;
  return rest;
}

// What actually gets JSON.stringify'd into localStorage: catalog items and
// placed objects keep every field except the (potentially multi-MB) base64
// imageDataUrl, which lives in IndexedDB instead (see imageStore.js) and is
// merged back in after hydration by restoreImagesIntoState below.
export function stripImagesFromState(state) {
  return {
    ...state,
    catalogItems: (state.catalogItems || []).map(stripImageDataUrl),
    objects: (state.objects || []).map(stripImageDataUrl),
    customMaterials: (state.customMaterials || []).map(stripImageDataUrl),
  };
}

// One-time migration path for state written before this fix: old persisted
// JSON may still have full base64 imageDataUrl strings embedded directly in
// catalogItems/objects. Pull them out into IndexedDB (keyed by their own
// item id) before stripping, so nothing is lost.
export async function extractEmbeddedImages(state) {
  const jobs = [];
  const visit = (item) => {
    if (typeof item?.imageDataUrl === 'string' && item.imageDataUrl.startsWith('data:')) {
      jobs.push(saveImageBlob(item.id, item.imageDataUrl));
    }
  };
  (state.catalogItems || []).forEach(visit);
  (state.objects || []).forEach(visit);
  (state.customMaterials || []).forEach(visit);
  await Promise.all(jobs);
  return stripImagesFromState(state);
}

// After hydration, catalogItems/objects only carry their id — this pulls the
// actual image data back out of IndexedDB and merges it into the live store
// so existing render code (which reads item.imageDataUrl directly) keeps
// working unchanged.
export async function restoreImagesIntoState(getState, setState) {
  const state = getState();
  const ids = [
    ...(state.catalogItems || []).map((item) => item.id),
    ...(state.objects || []).map((object) => object.id),
    ...(state.customMaterials || []).map((material) => material.id),
  ];
  const blobs = await getImageBlobs(ids);
  if (blobs.size === 0) return;
  setState({
    catalogItems: state.catalogItems.map((item) => (
      blobs.has(item.id) ? { ...item, imageDataUrl: blobs.get(item.id) } : item
    )),
    objects: state.objects.map((object) => (
      blobs.has(object.id) ? { ...object, imageDataUrl: blobs.get(object.id) } : object
    )),
    customMaterials: (state.customMaterials || []).map((material) => (
      blobs.has(material.id) ? { ...material, imageDataUrl: blobs.get(material.id) } : material
    )),
  });
}
