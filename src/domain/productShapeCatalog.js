// Single source of truth for the "register a product by name" flow's shape
// system. A registered product has no fixed category the way a facility
// catalog item does, so Gemini classifies its free-text name into one of the
// category ids below (src/services/productClassification.js), each of which
// maps to one of the ~30 hand-drawn parametric "archetype" shapes in
// productShapeArchetypes3D.jsx (rendered by Design3DView.jsx). Real
// per-product 3D geometry isn't generated — this is a "closest matching
// bucket" system, so some mappings are approximations (e.g. an outdoor
// umbrella reuses the floor-fan pole+disc archetype). Anything that doesn't
// classify into one of these ids falls back to a plain box.
//
// Grouped by domain purely for readability — classification and rendering
// both use the flat, merged list.

const SEATING = [
  { id: 'office_chair', archetype: 'chair', keywords: ['사무의자', '오피스체어', 'office chair'] },
  { id: 'dining_chair', archetype: 'chair', keywords: ['식탁의자', 'dining chair'] },
  { id: 'armchair', archetype: 'chair', keywords: ['안락의자', 'armchair'] },
  { id: 'accent_chair', archetype: 'chair', keywords: ['액센트체어', 'accent chair'] },
  { id: 'rocking_chair', archetype: 'chair', keywords: ['흔들의자', 'rocking chair'] },
  { id: 'recliner', archetype: 'chair', keywords: ['리클라이너', 'recliner'] },
  { id: 'gaming_chair', archetype: 'chair', keywords: ['게이밍체어', 'gaming chair'] },
  { id: 'high_chair', archetype: 'chair', keywords: ['아기의자', '하이체어', 'high chair'] },
  { id: 'folding_chair', archetype: 'chair', keywords: ['접이식의자', 'folding chair'] },
  { id: 'massage_chair', archetype: 'chair', keywords: ['안마의자', 'massage chair'] },
  { id: 'patio_chair', archetype: 'chair', keywords: ['야외의자', 'patio chair', 'outdoor chair'] },
  { id: 'bar_stool', archetype: 'stool', keywords: ['바스툴', '바의자', 'bar stool'] },
  { id: 'step_stool', archetype: 'stool', keywords: ['발판', 'step stool'] },
  { id: 'drafting_stool', archetype: 'stool', keywords: ['드래프팅스툴', 'drafting stool'] },
  { id: 'ottoman', archetype: 'stool', keywords: ['오토만', 'ottoman', 'footstool'] },
  { id: 'piano_bench', archetype: 'stool', keywords: ['피아노의자', 'piano bench'] },
  { id: 'shoe_bench', archetype: 'stool', keywords: ['신발벤치', 'shoe bench'] },
  { id: 'entryway_bench', archetype: 'stool', keywords: ['현관벤치', 'entryway bench'] },
  { id: 'sofa', archetype: 'sofa', keywords: ['소파', 'sofa'] },
  { id: 'loveseat', archetype: 'sofa', keywords: ['러브시트', 'loveseat'] },
  { id: 'sectional_sofa', archetype: 'sofa', keywords: ['섹셔널소파', 'sectional sofa'] },
  { id: 'futon', archetype: 'sofa', keywords: ['futon', '소파베드'] },
  { id: 'chaise_lounge', archetype: 'sofa', keywords: ['셰이즈라운지', 'chaise lounge'] },
  { id: 'bean_bag_chair', archetype: 'pillow', keywords: ['빈백', 'bean bag'] },
  { id: 'floor_cushion', archetype: 'pillow', keywords: ['바닥쿠션', 'floor cushion'] },
];

const TABLES_DESKS = [
  { id: 'coffee_table', archetype: 'table', keywords: ['커피테이블', 'coffee table'] },
  { id: 'side_table', archetype: 'table', keywords: ['사이드테이블', 'side table'] },
  { id: 'console_table', archetype: 'table', keywords: ['콘솔테이블', 'console table'] },
  { id: 'dining_table', archetype: 'table', keywords: ['식탁', 'dining table'] },
  { id: 'kitchen_island', archetype: 'table', keywords: ['아일랜드식탁', 'kitchen island'] },
  { id: 'office_desk', archetype: 'table', keywords: ['책상', 'office desk', 'desk'] },
  { id: 'computer_desk', archetype: 'table', keywords: ['컴퓨터책상', 'computer desk'] },
  { id: 'standing_desk', archetype: 'table', keywords: ['스탠딩데스크', 'standing desk'] },
  { id: 'conference_table', archetype: 'table', keywords: ['회의테이블', 'conference table'] },
  { id: 'reception_desk', archetype: 'table', keywords: ['리셉션데스크', 'reception desk'] },
  { id: 'drafting_table', archetype: 'table', keywords: ['제도테이블', 'drafting table'] },
  { id: 'picnic_table', archetype: 'table', keywords: ['피크닉테이블', 'picnic table'] },
  { id: 'workbench', archetype: 'table', keywords: ['작업대', 'workbench'] },
  { id: 'potting_bench', archetype: 'table', keywords: ['화분작업대', 'potting bench'] },
  { id: 'vanity_table', archetype: 'table', keywords: ['화장대', 'vanity table'] },
  { id: 'patio_table', archetype: 'table', keywords: ['야외테이블', 'patio table'] },
  { id: 'garden_bench', archetype: 'table', keywords: ['정원벤치', 'garden bench'] },
  { id: 'weight_bench', archetype: 'table', keywords: ['웨이트벤치', 'weight bench'] },
  { id: 'changing_table', archetype: 'drawer_chest', keywords: ['기저귀교환대', 'changing table'] },
];

const STORAGE = [
  { id: 'bookshelf', archetype: 'shelf', keywords: ['책장', '책꽂이', 'bookshelf', 'bookcase'] },
  { id: 'storage_shelf', archetype: 'shelf', keywords: ['수납선반', 'storage shelf'] },
  { id: 'shoe_rack', archetype: 'shelf', keywords: ['신발장', 'shoe rack'] },
  { id: 'wine_rack', archetype: 'shelf', keywords: ['와인랙', 'wine rack'] },
  { id: 'magazine_rack', archetype: 'shelf', keywords: ['잡지꽂이', 'magazine rack'] },
  { id: 'garage_shelving', archetype: 'shelf', keywords: ['차고선반', 'garage shelving'] },
  { id: 'plant_shelf', archetype: 'shelf', keywords: ['화분선반', 'plant shelf'] },
  { id: 'dumbbell_rack', archetype: 'shelf', keywords: ['덤벨랙', 'dumbbell rack'] },
  { id: 'filing_cabinet', archetype: 'cabinet', keywords: ['서류캐비닛', 'filing cabinet'] },
  { id: 'storage_cabinet', archetype: 'cabinet', keywords: ['수납장', 'storage cabinet'] },
  { id: 'locker', archetype: 'cabinet', keywords: ['사물함', 'locker'] },
  { id: 'tv_stand', archetype: 'cabinet', keywords: ['tv장', 'tv stand'] },
  { id: 'sideboard', archetype: 'cabinet', keywords: ['사이드보드', 'sideboard'] },
  { id: 'buffet_cabinet', archetype: 'cabinet', keywords: ['뷔페장', 'buffet'] },
  { id: 'china_cabinet', archetype: 'cabinet', keywords: ['그릇장', 'china cabinet'] },
  { id: 'display_case', archetype: 'cabinet', keywords: ['진열장', 'display case'] },
  { id: 'shoe_cabinet', archetype: 'cabinet', keywords: ['신발장', 'shoe cabinet'] },
  { id: 'kitchen_cabinet', archetype: 'cabinet', keywords: ['주방장', 'kitchen cabinet'] },
  { id: 'vanity_cabinet', archetype: 'cabinet', keywords: ['세면대수납장', 'vanity cabinet'] },
  { id: 'tool_cabinet', archetype: 'cabinet', keywords: ['공구캐비닛', 'tool cabinet'] },
  { id: 'mailbox', archetype: 'cabinet', keywords: ['우편함', 'mailbox'] },
  { id: 'wardrobe', archetype: 'wardrobe', keywords: ['옷장', 'wardrobe'] },
  { id: 'closet', archetype: 'wardrobe', keywords: ['붙박이장', 'closet'] },
  { id: 'armoire', archetype: 'wardrobe', keywords: ['아모아르', 'armoire'] },
  { id: 'pantry_cabinet', archetype: 'wardrobe', keywords: ['팬트리장', 'pantry'] },
  { id: 'nightstand', archetype: 'drawer_chest', keywords: ['협탁', 'nightstand'] },
  { id: 'dresser', archetype: 'drawer_chest', keywords: ['서랍장', 'dresser'] },
  { id: 'chest_of_drawers', archetype: 'drawer_chest', keywords: ['서랍장', 'chest of drawers'] },
  { id: 'jewelry_box', archetype: 'drawer_chest', keywords: ['보석함', 'jewelry box'] },
  { id: 'tool_chest', archetype: 'drawer_chest', keywords: ['공구함', 'tool chest'] },
  { id: 'storage_box', archetype: 'drawer_chest', keywords: ['수납박스', 'storage box'] },
];

const BEDROOM = [
  { id: 'bed', archetype: 'bed', keywords: ['침대', 'bed'] },
  { id: 'bed_frame', archetype: 'bed', keywords: ['침대프레임', 'bed frame'] },
  { id: 'mattress', archetype: 'bed', keywords: ['매트리스', 'mattress'] },
  { id: 'bunk_bed', archetype: 'bed', keywords: ['2층침대', 'bunk bed'] },
  { id: 'daybed', archetype: 'bed', keywords: ['데이베드', 'daybed'] },
  { id: 'crib', archetype: 'bed', keywords: ['아기침대', 'crib'] },
  { id: 'pillow', archetype: 'pillow', keywords: ['베개', 'pillow', '쿠션', 'cushion'] },
  { id: 'throw_pillow', archetype: 'pillow', keywords: ['쿠션', 'throw pillow'] },
  { id: 'blanket', archetype: 'blanket', keywords: ['이불', 'blanket'] },
  { id: 'comforter', archetype: 'blanket', keywords: ['컴포터', 'comforter'] },
  { id: 'duvet', archetype: 'blanket', keywords: ['듀벳', 'duvet'] },
  { id: 'full_length_mirror', archetype: 'mirror_frame', keywords: ['전신거울', 'full length mirror'] },
];

const KITCHEN = [
  { id: 'refrigerator', archetype: 'appliance', keywords: ['냉장고', 'refrigerator', 'fridge'] },
  { id: 'freezer', archetype: 'appliance', keywords: ['냉동고', 'freezer'] },
  { id: 'oven', archetype: 'appliance', keywords: ['오븐', 'oven'] },
  { id: 'stove', archetype: 'appliance', keywords: ['가스레인지', 'stove'] },
  { id: 'cooktop', archetype: 'appliance', keywords: ['쿡탑', 'cooktop'] },
  { id: 'microwave', archetype: 'appliance', keywords: ['전자레인지', 'microwave'] },
  { id: 'dishwasher', archetype: 'appliance', keywords: ['식기세척기', 'dishwasher'] },
  { id: 'range_hood', archetype: 'appliance', keywords: ['후드', 'range hood'] },
  { id: 'water_dispenser', archetype: 'appliance', keywords: ['정수기', 'water dispenser'] },
  { id: 'coffee_maker', archetype: 'appliance', keywords: ['커피머신', 'coffee maker'] },
  { id: 'toaster', archetype: 'appliance', keywords: ['토스터', 'toaster'] },
  { id: 'blender', archetype: 'appliance', keywords: ['블렌더', 'blender'] },
  { id: 'rice_cooker', archetype: 'appliance', keywords: ['밥솥', 'rice cooker'] },
  { id: 'wine_cooler', archetype: 'appliance', keywords: ['와인쿨러', 'wine cooler'] },
  { id: 'air_fryer', archetype: 'appliance', keywords: ['에어프라이어', 'air fryer'] },
  { id: 'kettle', archetype: 'appliance', keywords: ['전기포트', 'kettle'] },
  { id: 'bbq_grill', archetype: 'appliance', keywords: ['그릴', 'bbq grill', 'barbecue'] },
  { id: 'kitchen_sink', archetype: 'sink_basin', keywords: ['주방싱크대', 'kitchen sink'] },
  { id: 'trash_can', archetype: 'trash_bin', keywords: ['쓰레기통', 'trash can'] },
  { id: 'recycling_bin', archetype: 'trash_bin', keywords: ['분리수거함', 'recycling bin'] },
];

const BATHROOM = [
  { id: 'toilet', archetype: 'toilet', keywords: ['변기', 'toilet'] },
  { id: 'bathtub', archetype: 'bathtub', keywords: ['욕조', 'bathtub'] },
  { id: 'shower_stall', archetype: 'bathtub', keywords: ['샤워부스', 'shower stall', 'shower'] },
  { id: 'bathroom_sink', archetype: 'sink_basin', keywords: ['세면대', 'bathroom sink'] },
  { id: 'bathroom_mirror', archetype: 'mirror_frame', keywords: ['욕실거울', 'bathroom mirror'] },
  { id: 'towel_rack', archetype: 'coat_rack', keywords: ['수건걸이', 'towel rack'] },
  { id: 'towel_bar', archetype: 'coat_rack', keywords: ['타올바', 'towel bar'] },
  { id: 'washing_machine', archetype: 'appliance', keywords: ['세탁기', 'washing machine'] },
  { id: 'dryer_machine', archetype: 'appliance', keywords: ['건조기', 'dryer'] },
  { id: 'laundry_hamper', archetype: 'trash_bin', keywords: ['빨래바구니', 'laundry hamper', 'laundry basket'] },
  { id: 'bath_mat', archetype: 'rug', keywords: ['욕실매트', 'bath mat'] },
  { id: 'bathroom_scale', archetype: 'rug', keywords: ['체중계', 'bathroom scale'] },
  { id: 'plunger_holder', archetype: 'trash_bin', keywords: ['변기솔통', 'plunger holder'] },
];

const OFFICE_ELECTRONICS = [
  { id: 'computer_monitor', archetype: 'monitor', keywords: ['모니터', 'computer monitor', 'monitor'] },
  { id: 'laptop', archetype: 'monitor', keywords: ['노트북', 'laptop'] },
  { id: 'television', archetype: 'monitor', keywords: ['tv', 'television'] },
  { id: 'smart_tv', archetype: 'monitor', keywords: ['스마트tv', 'smart tv'] },
  { id: 'projector', archetype: 'monitor', keywords: ['프로젝터', 'projector'] },
  { id: 'projector_screen', archetype: 'mirror_frame', keywords: ['스크린', 'projector screen'] },
  { id: 'printer', archetype: 'appliance', keywords: ['프린터', 'printer'] },
  { id: 'scanner', archetype: 'appliance', keywords: ['스캐너', 'scanner'] },
  { id: 'server_rack', archetype: 'server_rack', keywords: ['서버랙', 'server rack'] },
  { id: 'network_rack', archetype: 'server_rack', keywords: ['네트워크랙', 'network rack'] },
  { id: 'router', archetype: 'appliance', keywords: ['공유기', 'router'] },
  { id: 'desk_lamp', archetype: 'lamp', keywords: ['스탠드조명', 'desk lamp'] },
  { id: 'floor_lamp', archetype: 'lamp', keywords: ['플로어램프', 'floor lamp'] },
  { id: 'reading_lamp', archetype: 'lamp', keywords: ['리딩램프', 'reading lamp'] },
  { id: 'whiteboard', archetype: 'mirror_frame', keywords: ['화이트보드', 'whiteboard'] },
  { id: 'bulletin_board', archetype: 'mirror_frame', keywords: ['게시판', 'bulletin board'] },
  { id: 'partition_screen', archetype: 'mirror_frame', keywords: ['파티션', 'partition'] },
  { id: 'cubicle_partition', archetype: 'mirror_frame', keywords: ['칸막이', 'cubicle partition'] },
  { id: 'room_divider', archetype: 'mirror_frame', keywords: ['룸디바이더', 'room divider'] },
  { id: 'coat_rack', archetype: 'coat_rack', keywords: ['옷걸이', 'coat rack'] },
  { id: 'paper_shredder', archetype: 'appliance', keywords: ['문서파쇄기', 'paper shredder'] },
];

const ELECTRONICS_MEDIA = [
  { id: 'speaker', archetype: 'speaker', keywords: ['스피커', 'speaker'] },
  { id: 'soundbar', archetype: 'speaker', keywords: ['사운드바', 'soundbar'] },
  { id: 'bluetooth_speaker', archetype: 'speaker', keywords: ['블루투스스피커', 'bluetooth speaker'] },
  { id: 'amplifier', archetype: 'speaker', keywords: ['앰프', 'amplifier'] },
  { id: 'security_camera', archetype: 'speaker', keywords: ['보안카메라', 'security camera', 'cctv'] },
  { id: 'turntable', archetype: 'cabinet', keywords: ['턴테이블', 'turntable'] },
  { id: 'gaming_console', archetype: 'cabinet', keywords: ['게임콘솔', 'gaming console'] },
  { id: 'computer_tower', archetype: 'cabinet', keywords: ['본체', 'computer tower', 'pc case'] },
  { id: 'smart_thermostat', archetype: 'mirror_frame', keywords: ['온도조절기', 'thermostat'] },
  { id: 'wall_clock', archetype: 'mirror_frame', keywords: ['벽시계', 'wall clock', 'clock'] },
  { id: 'air_purifier', archetype: 'appliance', keywords: ['공기청정기', 'air purifier'] },
  { id: 'humidifier', archetype: 'appliance', keywords: ['가습기', 'humidifier'] },
  { id: 'dehumidifier', archetype: 'appliance', keywords: ['제습기', 'dehumidifier'] },
  { id: 'electric_fan', archetype: 'floor_fan', keywords: ['선풍기', 'electric fan', 'fan'] },
  { id: 'air_conditioner', archetype: 'appliance', keywords: ['에어컨', 'air conditioner'] },
];

const LIGHTING_DECOR = [
  { id: 'pendant_light', archetype: 'pendant_lamp', keywords: ['펜던트조명', 'pendant light'] },
  { id: 'chandelier', archetype: 'pendant_lamp', keywords: ['샹들리에', 'chandelier'] },
  { id: 'ceiling_light', archetype: 'pendant_lamp', keywords: ['천장조명', 'ceiling light'] },
  { id: 'string_lights', archetype: 'pendant_lamp', keywords: ['전구줄', 'string lights'] },
  { id: 'wall_sconce', archetype: 'lamp', keywords: ['벽조명', 'wall sconce'] },
  { id: 'night_light', archetype: 'lamp', keywords: ['취침등', 'night light'] },
  { id: 'area_rug', archetype: 'rug', keywords: ['러그', 'area rug', 'rug'] },
  { id: 'yoga_mat', archetype: 'rug', keywords: ['요가매트', 'yoga mat'] },
  { id: 'door_mat', archetype: 'rug', keywords: ['현관매트', 'door mat'] },
  { id: 'curtain', archetype: 'curtain', keywords: ['커튼', 'curtain'] },
  { id: 'shower_curtain', archetype: 'curtain', keywords: ['샤워커튼', 'shower curtain'] },
  { id: 'tapestry', archetype: 'curtain', keywords: ['태피스트리', 'tapestry'] },
  { id: 'mirror', archetype: 'mirror_frame', keywords: ['거울', 'mirror'] },
  { id: 'picture_frame', archetype: 'mirror_frame', keywords: ['액자', 'picture frame'] },
  { id: 'wall_art', archetype: 'mirror_frame', keywords: ['벽걸이그림', 'wall art'] },
  { id: 'key_holder', archetype: 'mirror_frame', keywords: ['키홀더', 'key holder'] },
  { id: 'vase', archetype: 'pillow', keywords: ['꽃병', 'vase'] },
  { id: 'candle', archetype: 'pillow', keywords: ['양초', 'candle'] },
  { id: 'decorative_bowl', archetype: 'pillow', keywords: ['장식볼', 'decorative bowl'] },
];

const PLANTS_OUTDOOR = [
  { id: 'potted_plant', archetype: 'plant', keywords: ['화분', 'potted plant', '식물'] },
  { id: 'artificial_tree', archetype: 'plant', keywords: ['조화나무', 'artificial tree'] },
  { id: 'planter_box', archetype: 'plant', keywords: ['플랜터박스', 'planter box'] },
  { id: 'hanging_plant', archetype: 'plant', keywords: ['걸이화분', 'hanging plant'] },
  { id: 'umbrella_stand', archetype: 'coat_rack', keywords: ['우산꽂이', 'umbrella stand'] },
  { id: 'outdoor_umbrella', archetype: 'floor_fan', keywords: ['파라솔', 'outdoor umbrella', 'patio umbrella'] },
  { id: 'garden_hose_reel', archetype: 'trash_bin', keywords: ['호스릴', 'hose reel'] },
  { id: 'birdbath', archetype: 'sink_basin', keywords: ['버드배스', 'birdbath'] },
  { id: 'hat_rack', archetype: 'coat_rack', keywords: ['모자걸이', 'hat rack'] },
];

const EXERCISE_MUSIC = [
  { id: 'treadmill', archetype: 'treadmill', keywords: ['러닝머신', '트레드밀', 'treadmill'] },
  { id: 'exercise_bike', archetype: 'exercise_bike', keywords: ['실내자전거', 'exercise bike'] },
  { id: 'elliptical_machine', archetype: 'treadmill', keywords: ['일립티컬', 'elliptical'] },
  { id: 'pull_up_bar', archetype: 'coat_rack', keywords: ['철봉', 'pull up bar'] },
  { id: 'exercise_ball', archetype: 'pillow', keywords: ['짐볼', 'exercise ball', 'yoga ball'] },
  { id: 'yoga_block', archetype: 'pillow', keywords: ['요가블록', 'yoga block'] },
  { id: 'punching_bag', archetype: 'pillow', keywords: ['샌드백', 'punching bag'] },
  { id: 'piano', archetype: 'piano', keywords: ['피아노', 'piano'] },
  { id: 'keyboard_stand', archetype: 'piano', keywords: ['키보드스탠드', 'keyboard stand'] },
  { id: 'guitar_stand', archetype: 'coat_rack', keywords: ['기타스탠드', 'guitar stand'] },
  { id: 'music_stand', archetype: 'coat_rack', keywords: ['보면대', 'music stand'] },
  { id: 'easel', archetype: 'coat_rack', keywords: ['이젤', 'easel'] },
  { id: 'ladder', archetype: 'stairs', keywords: ['사다리', 'ladder'] },
  { id: 'step_ladder', archetype: 'stairs', keywords: ['계단사다리', 'step ladder'] },
];

export const PRODUCT_SHAPE_CATALOG = [
  ...SEATING,
  ...TABLES_DESKS,
  ...STORAGE,
  ...BEDROOM,
  ...KITCHEN,
  ...BATHROOM,
  ...OFFICE_ELECTRONICS,
  ...ELECTRONICS_MEDIA,
  ...LIGHTING_DECOR,
  ...PLANTS_OUTDOOR,
  ...EXERCISE_MUSIC,
];

// Flat id list (+ the "give up" escape hatch) — used verbatim in the Gemini
// classification prompt.
export const PRODUCT_SHAPE_CATEGORIES = [...PRODUCT_SHAPE_CATALOG.map((entry) => entry.id), 'box'];

export const PRODUCT_ARCHETYPE_BY_CATEGORY = Object.fromEntries(
  PRODUCT_SHAPE_CATALOG.map((entry) => [entry.id, entry.archetype])
);

export const PRODUCT_CATEGORY_KEYWORDS = PRODUCT_SHAPE_CATALOG;

// Guesses a category from a product's free-text name via keyword matching —
// used when Gemini classification fails/is unavailable, or for legacy
// objects saved before a category existed. Falls back to 'box' (a plain
// box) for anything unrecognized.
export function inferProductShapeCategory(label) {
  const text = (label || '').toLowerCase();
  const match = PRODUCT_CATEGORY_KEYWORDS.find(({ keywords }) => (
    keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  ));
  return match?.id || 'box';
}
