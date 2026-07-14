import { describe, it, expect } from 'vitest';
import {
  PRODUCT_SHAPE_CATALOG,
  PRODUCT_ARCHETYPE_BY_CATEGORY,
  inferProductShapeCategory,
} from './productShapeCatalog';
import { ARCHETYPE_COMPONENTS } from '../components/canvas/productShapeArchetypes3D';

describe('productShapeCatalog', () => {
  it('maps every category to an archetype that actually has a shape component', () => {
    const missing = PRODUCT_SHAPE_CATALOG
      .map((entry) => entry.archetype)
      .filter((archetype) => !ARCHETYPE_COMPONENTS[archetype]);
    expect(missing).toEqual([]);
  });

  it('has no duplicate category ids', () => {
    const ids = PRODUCT_SHAPE_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers at least 150 categories', () => {
    expect(PRODUCT_SHAPE_CATALOG.length).toBeGreaterThanOrEqual(150);
  });

  // Sample product names spanning every domain — none of these should fall
  // back to the plain-box category.
  const sampleNames = [
    '사무의자', '식탁의자', '흔들의자', '리클라이너', '바스툴', '소파', '빈백',
    '커피테이블', '책상', '회의테이블', '작업대',
    '책장', '서류캐비닛', 'tv장', '옷장', '붙박이장',
    '침대', '협탁', '서랍장', '베개', '이불',
    '냉장고', '전자레인지', '식기세척기', '주방싱크대', '쓰레기통',
    '변기', '욕조', '세면대', '수건걸이', '세탁기',
    '모니터', '노트북', '서버랙', '스탠드조명', '화이트보드', '콘센트', '멀티탭',
    '스피커', '보안카메라', '벽시계', '공기청정기', '선풍기',
    '펜던트조명', '샹들리에', '러그', '커튼', '창문', '거울', '꽃병',
    '화분', '파라솔',
    '러닝머신', '실내자전거', '피아노', '사다리',
  ];

  it.each(sampleNames)('classifies "%s" into a real (non-box) category', (name) => {
    const category = inferProductShapeCategory(name);
    expect(category).not.toBe('box');
    expect(PRODUCT_ARCHETYPE_BY_CATEGORY[category]).toBeDefined();
  });

  it('defaults bare "에어컨" to the wall-mounted AC archetype', () => {
    expect(inferProductShapeCategory('에어컨')).toBe('wall_mounted_ac');
  });

  it('routes "스탠드 에어컨" to the standing AC archetype, not wall-mounted', () => {
    expect(inferProductShapeCategory('스탠드 에어컨')).toBe('standing_ac');
  });

  it('routes "벽걸이 에어컨" to the wall-mounted AC archetype', () => {
    expect(inferProductShapeCategory('벽걸이 에어컨')).toBe('wall_mounted_ac');
  });
});
