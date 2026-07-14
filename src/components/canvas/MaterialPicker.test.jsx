import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAppStore } from '../../store/useAppStore';
import { MaterialPicker } from './MaterialPicker';

// renderMaterialThumbnail draws on a <canvas>, which jsdom doesn't actually
// implement without the native 'canvas' package — stub it, but faithfully
// reproduce the real function's failure mode (throws when handed something
// without `colors`, e.g. a custom material passed in by mistake) so this
// test still catches a regression of the isCustom routing bug below.
vi.mock('../../services/materialTexture', () => ({
  renderMaterialThumbnail: (material) => {
    if (!material.colors) throw new TypeError('undefined is not iterable');
    return 'data:image/png;base64,stub';
  },
}));

test('renders without crashing when a custom material is missing its image (e.g. evicted from IndexedDB)', () => {
  useAppStore.setState({
    customMaterials: [
      { id: 'broken-custom', category: 'wallpaper', label: '복구 실패한 마감재', createdAt: Date.now() },
    ],
  });

  render(<MaterialPicker />);

  expect(screen.getByText('복구 실패한 마감재')).toBeDefined();
});
