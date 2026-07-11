import { createId } from '../../domain/ids';
import { getFacilityTemplate } from '../../domain/facilityCatalog';

const PLACEMENT_STEP_M = 1;
const PLACEMENT_GRID_COLS = 3;
const DUPLICATE_OFFSET_M = 0.5;
const DEFAULT_VERTICAL_HEIGHT_MM = 800;
const DEFAULT_PRODUCT_SIZE_M = 1;

function placementOffset(existingCountOnFloor) {
  const index = existingCountOnFloor % (PLACEMENT_GRID_COLS * PLACEMENT_GRID_COLS);
  const col = index % PLACEMENT_GRID_COLS;
  const row = Math.floor(index / PLACEMENT_GRID_COLS);
  return {
    dx: (col - 1) * PLACEMENT_STEP_M,
    dy: (row - 1) * PLACEMENT_STEP_M,
  };
}

function buildProductObject(catalogItem, floorId, xM, yM) {
  return {
    id: createId(),
    floorId,
    kind: 'product',
    category: 'custom',
    label: catalogItem.label,
    fill: '#93C5FD',
    imageDataUrl: catalogItem.imageDataUrl,
    modelUrl: catalogItem.modelUrl || null,
    x: xM,
    y: yM,
    width: catalogItem.width || DEFAULT_PRODUCT_SIZE_M,
    height: catalogItem.height || DEFAULT_PRODUCT_SIZE_M,
    verticalHeightMm: catalogItem.verticalHeightMm || DEFAULT_VERTICAL_HEIGHT_MM,
    brand: catalogItem.brand || '',
    material: catalogItem.material || '',
    color: catalogItem.color || '',
    manufacturer: catalogItem.manufacturer || '',
    link: catalogItem.link || '',
    memo: catalogItem.memo || '',
    rotation: 0,
    flipX: false,
    flipY: false,
    locked: false,
    groupId: null,
  };
}

function dropOrphanGroups(objects) {
  const counts = objects.reduce((acc, o) => {
    if (!o.groupId) return acc;
    acc[o.groupId] = (acc[o.groupId] || 0) + 1;
    return acc;
  }, {});
  return objects.map((o) => (
    o.groupId && counts[o.groupId] < 2 ? { ...o, groupId: null } : o
  ));
}

export const createObjectsSlice = (set, get) => ({
  objects: [],

  addFacility: (category, floorId) => {
    const template = getFacilityTemplate(category);
    if (!template) return;
    const { building, objects } = get();
    const footprint = building?.footprint ?? { widthM: 10, depthM: 10 };
    const existingCount = objects.filter((o) => o.floorId === floorId).length;
    const { dx, dy } = placementOffset(existingCount);

    const newObject = {
      id: createId(),
      floorId,
      kind: 'facility',
      category,
      label: template.label,
      fill: template.fill,
      x: footprint.widthM / 2 + dx,
      y: footprint.depthM / 2 + dy,
      width: template.widthM,
      height: template.depthM,
      verticalHeightMm: DEFAULT_VERTICAL_HEIGHT_MM,
      memo: '',
      rotation: 0,
      flipX: false,
      flipY: false,
      locked: false,
      groupId: null,
    };
    set({ objects: [...objects, newObject] });
    return newObject.id;
  },

  addGeneric: (floorId) => {
    const { building, objects } = get();
    const footprint = building?.footprint ?? { widthM: 10, depthM: 10 };
    const existingCount = objects.filter((o) => o.floorId === floorId).length;
    const { dx, dy } = placementOffset(existingCount);

    const newObject = {
      id: createId(),
      floorId,
      kind: 'generic',
      category: 'custom',
      label: '오브젝트',
      fill: '#93C5FD',
      x: footprint.widthM / 2 + dx,
      y: footprint.depthM / 2 + dy,
      width: 2,
      height: 2,
      verticalHeightMm: DEFAULT_VERTICAL_HEIGHT_MM,
      memo: '',
      rotation: 0,
      flipX: false,
      flipY: false,
      locked: false,
      groupId: null,
    };
    set({ objects: [...objects, newObject] });
    return newObject.id;
  },

  addCatalogProduct: (catalogItemId, floorId) => {
    const { building, objects, catalogItems } = get();
    const catalogItem = catalogItems.find((item) => item.id === catalogItemId);
    if (!catalogItem) return null;

    const footprint = building?.footprint ?? { widthM: 10, depthM: 10 };
    const existingCount = objects.filter((o) => o.floorId === floorId).length;
    const { dx, dy } = placementOffset(existingCount);

    const newObject = buildProductObject(catalogItem, floorId, footprint.widthM / 2 + dx, footprint.depthM / 2 + dy);
    set({ objects: [...objects, newObject] });
    return newObject.id;
  },

  // Same as addCatalogProduct, but drops the product at an explicit world position
  // (used by click-to-place: the caller already resolved the canvas click to world coords).
  placeCatalogProductAt: (catalogItemId, floorId, xM, yM) => {
    const { objects, catalogItems } = get();
    const catalogItem = catalogItems.find((item) => item.id === catalogItemId);
    if (!catalogItem) return null;

    const newObject = buildProductObject(catalogItem, floorId, xM, yM);
    set({ objects: [...objects, newObject] });
    return newObject.id;
  },

  // Clones a placed object (Ctrl+drag copy) at an explicit world position with a fresh id.
  duplicateObjectAt: (id, xM, yM) => {
    const { objects } = get();
    const source = objects.find((o) => o.id === id);
    if (!source) return null;

    const copy = {
      ...source,
      id: createId(),
      x: xM,
      y: yM,
      locked: false,
      groupId: null,
    };
    set({ objects: [...objects, copy] });
    return copy.id;
  },

  updateObjectTransform: (id, transform) => {
    set({
      objects: get().objects.map((o) => (o.id === id ? { ...o, ...transform } : o)),
    });
  },

  updateObjectDetails: (id, patch) => {
    set({
      objects: get().objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  },

  updateObjectPosition: (id, x, y) => {
    set({
      objects: get().objects.map((o) => (o.id === id ? { ...o, x, y } : o)),
    });
  },

  applyDeltaToSelection: (ids, dx, dy) => {
    const idSet = new Set(ids);
    set({
      objects: get().objects.map((o) => (
        idSet.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o
      )),
    });
  },

  rotateSelectionBy: (ids, degrees) => {
    const idSet = new Set(ids);
    set({
      objects: get().objects.map((o) => (
        idSet.has(o.id) ? { ...o, rotation: (o.rotation + degrees + 360) % 360 } : o
      )),
    });
  },

  flipSelection: (ids, axis) => {
    const idSet = new Set(ids);
    const key = axis === 'x' ? 'flipX' : 'flipY';
    set({
      objects: get().objects.map((o) => (
        idSet.has(o.id) ? { ...o, [key]: !o[key] } : o
      )),
    });
  },

  duplicateSelection: (ids) => {
    const { objects } = get();
    const selected = objects.filter((o) => ids.includes(o.id));
    if (selected.length === 0) return [];

    const groupIds = new Set(selected.map((o) => o.groupId).filter(Boolean));
    const isPersistedGroup = groupIds.size === 1 && selected.every((o) => o.groupId);
    const newGroupId = selected.length > 1 && isPersistedGroup ? createId() : null;

    const duplicates = selected.map((o) => ({
      ...o,
      id: createId(),
      x: o.x + DUPLICATE_OFFSET_M,
      y: o.y + DUPLICATE_OFFSET_M,
      groupId: newGroupId,
    }));

    set({ objects: [...objects, ...duplicates] });
    return duplicates.map((d) => d.id);
  },

  removeObjects: (ids) => {
    const idSet = new Set(ids);
    const remaining = get().objects.filter((o) => !idSet.has(o.id));
    set({ objects: dropOrphanGroups(remaining), selectedIds: [] });
  },

  moveObjectsToFloor: (ids, floorId) => {
    const idSet = new Set(ids);
    set({
      objects: get().objects.map((o) => (
        idSet.has(o.id) ? { ...o, floorId } : o
      )),
      selectedIds: [],
    });
  },

  groupObjects: (ids) => {
    if (ids.length < 2) return;
    const idSet = new Set(ids);
    const groupId = createId();
    set({
      objects: get().objects.map((o) => (
        idSet.has(o.id) ? { ...o, groupId } : o
      )),
    });
  },

  ungroupObjects: (ids) => {
    const { objects } = get();
    const groupIdsToClear = new Set(
      objects.filter((o) => ids.includes(o.id) && o.groupId).map((o) => o.groupId)
    );
    if (groupIdsToClear.size === 0) return;
    set({
      objects: objects.map((o) => (
        o.groupId && groupIdsToClear.has(o.groupId) ? { ...o, groupId: null } : o
      )),
    });
  },
});
