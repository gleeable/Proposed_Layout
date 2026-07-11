import { describe, expect, test } from 'vitest';
import { create } from 'zustand';
import { createObjectsSlice } from './objectsSlice';
import { createCatalogSlice } from './catalogSlice';
import { createHistorySlice } from './historySlice';

function makeStore() {
  return create((...a) => ({ ...createObjectsSlice(...a), ...createHistorySlice(...a) }));
}

function makeStoreWithCatalog() {
  return create((...a) => ({
    ...createObjectsSlice(...a),
    ...createCatalogSlice(...a),
    ...createHistorySlice(...a),
  }));
}

describe('objectsSlice', () => {
  test('duplicateSelection clones with a new id, offset position, same floor', () => {
    const store = makeStore();
    const id = store.getState().addGeneric('floor-1');
    const original = store.getState().objects.find((o) => o.id === id);

    const [dupId] = store.getState().duplicateSelection([id]);
    const dup = store.getState().objects.find((o) => o.id === dupId);

    expect(dupId).not.toBe(id);
    expect(dup.floorId).toBe('floor-1');
    expect(dup.x).not.toBe(original.x);
    expect(dup.y).not.toBe(original.y);
  });

  test('moveObjectsToFloor updates floorId', () => {
    const store = makeStore();
    const id = store.getState().addGeneric('floor-1');

    store.getState().moveObjectsToFloor([id], 'floor-2');

    expect(store.getState().objects.find((o) => o.id === id).floorId).toBe('floor-2');
  });

  test('groupObjects assigns a shared groupId, ungroupObjects clears it', () => {
    const store = makeStore();
    const id1 = store.getState().addGeneric('floor-1');
    const id2 = store.getState().addGeneric('floor-1');

    store.getState().groupObjects([id1, id2]);
    const [o1, o2] = store.getState().objects;
    expect(o1.groupId).toBeTruthy();
    expect(o1.groupId).toBe(o2.groupId);

    store.getState().ungroupObjects([id1]);
    store.getState().objects.forEach((o) => expect(o.groupId).toBeNull());
  });

  test('removing a group down to a single member clears that member groupId (no orphan group)', () => {
    const store = makeStore();
    const id1 = store.getState().addGeneric('floor-1');
    const id2 = store.getState().addGeneric('floor-1');
    const id3 = store.getState().addGeneric('floor-1');
    store.getState().groupObjects([id1, id2, id3]);

    store.getState().removeObjects([id3]);
    let remaining = store.getState().objects;
    expect(remaining.every((o) => o.groupId)).toBe(true);

    store.getState().removeObjects([id2]);
    remaining = store.getState().objects;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].groupId).toBeNull();
  });

  test('updateObjectDetails merges width/height/verticalHeightMm/label/memo', () => {
    const store = makeStore();
    const id = store.getState().addGeneric('floor-1');

    store.getState().updateObjectDetails(id, {
      width: 1.2,
      height: 0.7,
      verticalHeightMm: 750,
      rotation: 90,
      label: '카페 테이블',
      memo: '창가 쪽 배치',
    });

    const updated = store.getState().objects.find((o) => o.id === id);
    expect(updated.width).toBe(1.2);
    expect(updated.height).toBe(0.7);
    expect(updated.verticalHeightMm).toBe(750);
    expect(updated.rotation).toBe(90);
    expect(updated.label).toBe('카페 테이블');
    expect(updated.memo).toBe('창가 쪽 배치');
  });

  test('addCatalogProduct copies label/imageDataUrl from the catalog item onto a new placed object', () => {
    const store = makeStoreWithCatalog();
    const catalogId = store.getState().addPhotoProduct({
      label: '카페 테이블',
      imageDataUrl: 'data:image/png;base64,abc',
    });

    const objectId = store.getState().addCatalogProduct(catalogId, 'floor-1');

    const placed = store.getState().objects.find((o) => o.id === objectId);
    expect(placed.floorId).toBe('floor-1');
    expect(placed.kind).toBe('product');
    expect(placed.label).toBe('카페 테이블');
    expect(placed.imageDataUrl).toBe('data:image/png;base64,abc');
  });

  test('undo reverts the last mutation, redo re-applies it', () => {
    const store = makeStore();
    const id = store.getState().addGeneric('floor-1');
    expect(store.getState().objects).toHaveLength(1);

    store.getState().updateObjectPosition(id, 9, 9);
    expect(store.getState().objects.find((o) => o.id === id).x).toBe(9);

    store.getState().undo();
    expect(store.getState().objects.find((o) => o.id === id).x).not.toBe(9);

    store.getState().undo();
    expect(store.getState().objects).toHaveLength(0);

    store.getState().redo();
    expect(store.getState().objects).toHaveLength(1);
    store.getState().redo();
    expect(store.getState().objects.find((o) => o.id === id).x).toBe(9);
  });

  test('a new action after undo clears the redo stack', () => {
    const store = makeStore();
    const id1 = store.getState().addGeneric('floor-1');
    store.getState().undo();
    expect(store.getState().objects).toHaveLength(0);

    store.getState().addGeneric('floor-1');
    expect(store.getState().future).toHaveLength(0);
    store.getState().redo();
    // nothing to redo — the branch created by the new addGeneric replaced it
    expect(store.getState().objects).toHaveLength(1);
    expect(store.getState().objects[0].id).not.toBe(id1);
  });

  test('undo/redo with nothing on the stack is a no-op, not a crash', () => {
    const store = makeStore();
    expect(() => store.getState().undo()).not.toThrow();
    expect(() => store.getState().redo()).not.toThrow();
    expect(store.getState().objects).toHaveLength(0);
  });
});
