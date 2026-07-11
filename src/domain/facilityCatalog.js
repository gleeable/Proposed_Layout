export const FACILITY_CATALOG = [
  { category: 'stairs', label: '계단', widthM: 2.4, depthM: 3, fill: '#9CA3AF' },
  { category: 'elevator', label: '엘리베이터', widthM: 2, depthM: 2, fill: '#6B7280' },
  { category: 'mechanical_room', label: '기계실', widthM: 3, depthM: 3, fill: '#78716C' },
  { category: 'water_tank_room', label: '물탱크실', widthM: 2.5, depthM: 2.5, fill: '#60A5FA' },
  { category: 'electrical_room', label: '전기실', widthM: 2, depthM: 2, fill: '#FBBF24' },
  { category: 'eps_room', label: 'EPS실', widthM: 1, depthM: 1, fill: '#F59E0B' },
  { category: 'fire_safety', label: '소방 관련 공간', widthM: 2, depthM: 2, fill: '#F87171' },
  { category: 'management_office', label: '관리실', widthM: 3, depthM: 3, fill: '#A78BFA' },
  { category: 'corridor', label: '공용복도', widthM: 6, depthM: 1.5, fill: '#D1D5DB' },
  { category: 'utility_space', label: '기본 설비 공간', widthM: 2, depthM: 2, fill: '#34D399' },
  { category: 'partition_wall', label: '', widthM: 1, depthM: 1, fill: '#9CA3AF' },
  { category: 'tree', label: '나무', widthM: 1.2, depthM: 1.2, fill: '#4ADE80' },
  { category: 'table', label: '테이블', widthM: 1.2, depthM: 0.8, fill: '#D6A77A' },
  { category: 'chair', label: '의자', widthM: 0.5, depthM: 0.5, fill: '#E7E5E4' },
  { category: 'door', label: '문', widthM: 0.9, depthM: 0.9, fill: '#D6D3D1' },
  { category: 'window', label: '창문', widthM: 1.2, depthM: 0.15, fill: '#BFDBFE', verticalHeightMm: 1200, elevationMm: 900 },
  { category: 'bed', label: '침대', widthM: 1.5, depthM: 2, fill: '#F5F5F4', verticalHeightMm: 500 },
  { category: 'blanket', label: '이불', widthM: 1.5, depthM: 2, fill: '#BFDBFE', verticalHeightMm: 60 },
  { category: 'pillow', label: '베개', widthM: 0.5, depthM: 0.35, fill: '#FAFAF9', verticalHeightMm: 150 },
];

export function getFacilityTemplate(category) {
  return FACILITY_CATALOG.find((item) => item.category === category) || null;
}
