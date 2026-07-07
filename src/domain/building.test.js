import { describe, expect, test } from 'vitest';
import { deriveFloorCount, deriveFootprintArea, deriveTotalFloorArea, buildBuilding } from './building';

describe('building derivation', () => {
  test('standard case: 500㎡ site, 40% BCR, 200% FAR -> 5 floors', () => {
    const footprintArea = deriveFootprintArea(500, 40);
    const totalFloorArea = deriveTotalFloorArea(500, 200);
    expect(footprintArea).toBe(200);
    expect(totalFloorArea).toBe(1000);
    expect(deriveFloorCount(totalFloorArea, footprintArea)).toBe(5);
  });

  test('explicit floor count override bypasses derivation', () => {
    const building = buildBuilding({
      siteAreaM2: 500,
      bcrPercent: 40,
      farPercent: 200,
      heightM: null,
      floorCountOverride: 12,
    });
    expect(building.floorCount).toBe(12);
  });

  test('bcr=0 guards against division by zero', () => {
    expect(deriveFloorCount(1000, 0)).toBe(1);
  });

  test('floor count clamps to a minimum of 1', () => {
    expect(deriveFloorCount(10, 1000)).toBe(1);
  });
});
