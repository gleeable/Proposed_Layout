// Built-in finish materials the 2D palette's "마감재" picker offers, split
// into the three surfaces the 3D view can actually texture: wallpaper
// (walls), floor, and tile (walls or floor — see MaterialPicker's apply
// buttons). Each is rendered procedurally by materialTexture.js rather than
// shipping real photos, so `pattern`/`colors` describe how to draw it rather
// than pointing at an asset.
export const MATERIAL_CATEGORIES = ['wallpaper', 'floor', 'tile'];

export const MATERIAL_CATEGORY_LABELS = {
  wallpaper: '벽지',
  floor: '바닥',
  tile: '타일',
};

export const DEFAULT_MATERIALS = [
  // --- 벽지 (wallpaper) ---
  { id: 'wp-white-plain', category: 'wallpaper', label: '화이트 무지 벽지', pattern: 'solid', colors: ['#F5F5F0'] },
  { id: 'wp-light-gray-fabric', category: 'wallpaper', label: '라이트 그레이 패브릭 벽지', pattern: 'weave', colors: ['#D8D8D8', '#C2C2C2'] },
  { id: 'wp-deep-navy', category: 'wallpaper', label: '딥 네이비 벽지', pattern: 'solid', colors: ['#1F2A44'] },
  { id: 'wp-beige-linen', category: 'wallpaper', label: '베이지 리넨 벽지', pattern: 'weave', colors: ['#E4D8C3', '#D8C8A8'] },
  { id: 'wp-sage-green', category: 'wallpaper', label: '세이지 그린 벽지', pattern: 'solid', colors: ['#9CAF88'] },
  { id: 'wp-charcoal-gray', category: 'wallpaper', label: '차콜 그레이 벽지', pattern: 'solid', colors: ['#3A3A3C'] },
  { id: 'wp-terracotta', category: 'wallpaper', label: '테라코타 벽지', pattern: 'solid', colors: ['#C97B4A'] },
  { id: 'wp-soft-pink', category: 'wallpaper', label: '소프트 핑크 벽지', pattern: 'solid', colors: ['#F0D8D8'] },
  { id: 'wp-gray-oak-panel', category: 'wallpaper', label: '우드 패널 벽지 (그레이 오크)', pattern: 'grain', colors: ['#B8AFA0', '#8C8272'] },
  { id: 'wp-gold-accent', category: 'wallpaper', label: '골드 액센트 벽지', pattern: 'marble', colors: ['#D9C89A', '#BFA76A'] },

  // --- 바닥 (floor) ---
  { id: 'fl-white-oak', category: 'floor', label: '화이트 오크 원목마루', pattern: 'grain', colors: ['#D9C7A3', '#B8A47D'] },
  { id: 'fl-walnut', category: 'floor', label: '월넛 원목마루', pattern: 'grain', colors: ['#6B4A34', '#4A3122'] },
  { id: 'fl-dark-cherry', category: 'floor', label: '다크 체리 마루', pattern: 'grain', colors: ['#5A2E23', '#3C1E17'] },
  { id: 'fl-ash-gray', category: 'floor', label: '애쉬 그레이 마루', pattern: 'grain', colors: ['#C8C4BC', '#A8A39A'] },
  { id: 'fl-herringbone-oak', category: 'floor', label: '헤링본 오크 마루', pattern: 'grain', colors: ['#C9AE82', '#A8895F'] },
  { id: 'fl-polished-concrete', category: 'floor', label: '콘크리트 폴리싱 바닥', pattern: 'speckle', colors: ['#B9B9B4', '#9C9C97'] },
  { id: 'fl-carpet-charcoal', category: 'floor', label: '카펫 (차콜)', pattern: 'weave', colors: ['#4B4B4E', '#3A3A3D'] },
  { id: 'fl-carpet-beige', category: 'floor', label: '카펫 (라이트 베이지)', pattern: 'weave', colors: ['#DCD3C3', '#C7BCA6'] },
  { id: 'fl-vinyl-gray', category: 'floor', label: '비닐 그레이 바닥재', pattern: 'solid', colors: ['#A9ACAF'] },
  { id: 'fl-terrazzo', category: 'floor', label: '테라조 바닥', pattern: 'speckle', colors: ['#EDEAE3', '#C9A9A0'] },

  // --- 타일 (tile) ---
  { id: 'tl-white-matte', category: 'tile', label: '화이트 무광 타일', pattern: 'grid', colors: ['#F2F2F0'] },
  { id: 'tl-light-gray-porcelain', category: 'tile', label: '라이트 그레이 포세린 타일', pattern: 'grid', colors: ['#D3D3D0'] },
  { id: 'tl-dark-gray-large', category: 'tile', label: '다크 그레이 대형 타일', pattern: 'grid', colors: ['#545458'] },
  { id: 'tl-hexagon-mosaic', category: 'tile', label: '헥사곤 모자이크 타일', pattern: 'grid', colors: ['#E7E1D8', '#C9B79A'] },
  { id: 'tl-black-marble', category: 'tile', label: '블랙 마블 타일', pattern: 'marble', colors: ['#2B2B2E', '#4A4A4E'] },
  { id: 'tl-white-marble', category: 'tile', label: '화이트 마블 타일', pattern: 'marble', colors: ['#F0EFEA', '#C9C6BE'] },
  { id: 'tl-terracotta-clay', category: 'tile', label: '테라코타 클레이 타일', pattern: 'grid', colors: ['#C1785A'] },
  { id: 'tl-blue-moroccan', category: 'tile', label: '블루 모로칸 타일', pattern: 'grid', colors: ['#2C5F7C', '#3E7A9C'] },
  { id: 'tl-subway-white', category: 'tile', label: '서브웨이 화이트 타일', pattern: 'brick', colors: ['#F5F5F2'] },
  { id: 'tl-travertine', category: 'tile', label: '트래버틴 타일', pattern: 'speckle', colors: ['#DCD0BC', '#C7B99E'] },
];

export function getMaterialsByCategory(category) {
  return DEFAULT_MATERIALS.filter((m) => m.category === category);
}

export function getDefaultMaterial(id) {
  return DEFAULT_MATERIALS.find((m) => m.id === id) || null;
}
