import { describe, expect, test } from 'vitest';
import { create } from 'zustand';
import { createCatalogSlice } from './catalogSlice';

function makeStore() {
  return create((...a) => ({ ...createCatalogSlice(...a) }));
}

describe('catalogSlice', () => {
  test('addPhotoProduct adds an item with source photo and the given image', () => {
    const store = makeStore();
    const id = store.getState().addPhotoProduct({ label: '카페 테이블', imageDataUrl: 'data:image/png;base64,abc' });

    const item = store.getState().catalogItems.find((i) => i.id === id);
    expect(item.source).toBe('photo');
    expect(item.label).toBe('카페 테이블');
    expect(item.imageDataUrl).toBe('data:image/png;base64,abc');
  });

  test('addGeneratedProduct adds an item with source generated and no image', () => {
    const store = makeStore();
    const id = store.getState().addGeneratedProduct({ label: '리셉션 데스크' });

    const item = store.getState().catalogItems.find((i) => i.id === id);
    expect(item.source).toBe('generated');
    expect(item.label).toBe('리셉션 데스크');
    expect(item.imageDataUrl).toBeNull();
  });

  test('removeCatalogItem removes the item', () => {
    const store = makeStore();
    const id = store.getState().addGeneratedProduct({ label: '의자' });

    store.getState().removeCatalogItem(id);

    expect(store.getState().catalogItems).toHaveLength(0);
  });
});
