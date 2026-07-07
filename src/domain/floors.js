import { createId } from './ids';

export function generateFloors(floorCount) {
  const count = Math.max(1, Math.round(floorCount));
  const floors = [];
  for (let index = 1; index <= count; index += 1) {
    floors.push({
      id: createId(),
      index,
      label: `${index}F`,
    });
  }
  return floors;
}
