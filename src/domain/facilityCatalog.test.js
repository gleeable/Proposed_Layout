import { describe, expect, test } from 'vitest';
import { FACILITY_CATALOG } from './facilityCatalog';

const EXPECTED_CATEGORIES = [
  'stairs',
  'elevator',
  'mechanical_room',
  'water_tank_room',
  'electrical_room',
  'eps_room',
  'fire_safety',
  'management_office',
  'corridor',
  'utility_space',
  'partition_wall',
  'tree',
  'table',
  'chair',
  'door',
  'auto_door',
  'window',
  'bed',
  'blanket',
  'pillow',
  'triangle',
];

describe('facility catalog', () => {
  test('contains all 21 required facility categories', () => {
    const categories = FACILITY_CATALOG.map((item) => item.category);
    EXPECTED_CATEGORIES.forEach((category) => {
      expect(categories).toContain(category);
    });
    expect(FACILITY_CATALOG).toHaveLength(21);
  });

  test('every facility has a positive default size', () => {
    FACILITY_CATALOG.forEach((item) => {
      expect(item.widthM).toBeGreaterThan(0);
      expect(item.depthM).toBeGreaterThan(0);
    });
  });
});
