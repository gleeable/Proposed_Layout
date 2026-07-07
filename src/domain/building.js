import { createId } from './ids';

const FOOTPRINT_ASPECT_RATIO = 1.4;
const MIN_FOOTPRINT_WIDTH_M = 6;
const MIN_FOOTPRINT_DEPTH_M = 4;
const MIN_FLOOR_COUNT = 1;

export function deriveFootprintArea(siteAreaM2, bcrPercent) {
  return Math.max(0, siteAreaM2) * Math.max(0, bcrPercent) / 100;
}

export function deriveTotalFloorArea(siteAreaM2, farPercent) {
  return Math.max(0, siteAreaM2) * Math.max(0, farPercent) / 100;
}

export function deriveFloorCount(totalFloorArea, footprintArea) {
  if (footprintArea <= 0) return MIN_FLOOR_COUNT;
  return Math.max(MIN_FLOOR_COUNT, Math.round(totalFloorArea / footprintArea));
}

export function deriveFootprintDims(footprintArea) {
  const safeArea = Math.max(0, footprintArea);
  const width = Math.sqrt(safeArea * FOOTPRINT_ASPECT_RATIO);
  const depth = width > 0 ? safeArea / width : 0;
  return {
    widthM: Math.max(MIN_FOOTPRINT_WIDTH_M, width),
    depthM: Math.max(MIN_FOOTPRINT_DEPTH_M, depth),
  };
}

export function buildBuilding({
  siteAreaM2,
  bcrPercent,
  farPercent,
  heightM,
  floorCountOverride,
  sitePlanFileName,
  address,
}) {
  const footprintArea = deriveFootprintArea(siteAreaM2, bcrPercent);
  const totalFloorArea = deriveTotalFloorArea(siteAreaM2, farPercent);
  const floorCount = floorCountOverride && floorCountOverride > 0
    ? Math.round(floorCountOverride)
    : deriveFloorCount(totalFloorArea, footprintArea);

  return {
    id: createId(),
    siteAreaM2,
    bcrPercent,
    farPercent,
    heightM: heightM || null,
    floorCount,
    footprint: deriveFootprintDims(footprintArea),
    sitePlanFileName: sitePlanFileName || null,
    address: address || null,
  };
}
