import { describe, expect, test } from 'vitest';
import { normalizeTransform } from './transform';

describe('normalizeTransform', () => {
  test('converts scaleX/scaleY into width/height', () => {
    const result = normalizeTransform({
      x: 10,
      y: 20,
      width: 2,
      height: 4,
      scaleX: 2,
      scaleY: 1.5,
      rotation: 45,
    });
    expect(result).toEqual({ x: 10, y: 20, width: 4, height: 6, rotation: 45 });
  });

  test('does not compound scale across repeated calls with the returned width/height', () => {
    const first = normalizeTransform({
      x: 0, y: 0, width: 2, height: 2, scaleX: 2, scaleY: 2, rotation: 0,
    });
    const second = normalizeTransform({
      x: 0, y: 0, width: first.width, height: first.height, scaleX: 1, scaleY: 1, rotation: 0,
    });
    expect(second.width).toBe(4);
    expect(second.height).toBe(4);
  });

  test('passes rotation through unchanged', () => {
    const result = normalizeTransform({
      x: 0, y: 0, width: 1, height: 1, scaleX: 1, scaleY: 1, rotation: 123,
    });
    expect(result.rotation).toBe(123);
  });

  test('clamps below the minimum size', () => {
    const result = normalizeTransform({
      x: 0, y: 0, width: 1, height: 1, scaleX: 0.01, scaleY: 0.01, rotation: 0,
    });
    expect(result.width).toBeGreaterThanOrEqual(0.2);
    expect(result.height).toBeGreaterThanOrEqual(0.2);
  });
});
