// Categories the 3D view (Design3DView.jsx / ProductShape3D) knows how to
// hand-draw. Keep this list in sync with PRODUCT_CATEGORY_KEYWORDS and the
// ProductShape3D switch there.
export const PRODUCT_SHAPE_CATEGORIES = [
  'chair', 'table', 'sofa', 'shelf', 'cabinet', 'monitor', 'lamp', 'plant', 'appliance',
  'bed', 'pillow', 'hairdryer', 'box',
];

const MODEL = 'gemini-2.5-flash';
const API_KEY = import.meta.env.VITE_GOOGLE_AI_STUDIO_APIKEY;
const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

function buildPrompt(productName) {
  return `Classify the furniture/product named "${productName}" into exactly one of these categories: ${PRODUCT_SHAPE_CATEGORIES.join(', ')}. Reply with only the single category word in lowercase, nothing else. If none fit well, reply "box".`;
}

function normalizeWorkerUrl(workerUrl) {
  return workerUrl.replace(/\/$/, '');
}

function isPlaceholderWorkerUrl(workerUrl) {
  return workerUrl.includes('your-worker') || workerUrl.includes('your-subdomain');
}

function extractCategory(text) {
  const match = (text || '').toLowerCase().match(/[a-z]+/);
  const category = match?.[0];
  return PRODUCT_SHAPE_CATEGORIES.includes(category) ? category : null;
}

async function parseClassificationResponse(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error?.message || body?.error || fallbackMessage);
  }

  if (body?.category) return body.category;

  const parts = body?.candidates?.[0]?.content?.parts || [];
  const text = parts.find((part) => typeof part.text === 'string')?.text;
  return extractCategory(text);
}

async function classifyViaLocalApi(productName) {
  let response;
  try {
    response = await fetch('/api/classify-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, prompt: buildPrompt(productName) }),
    });
  } catch (error) {
    throw new Error(`로컬 분류 API 연결 실패: ${error.message}`);
  }
  return parseClassificationResponse(response, `로컬 분류 요청 실패 (HTTP ${response.status})`);
}

async function classifyViaWorker(productName) {
  let response;
  try {
    response = await fetch(`${normalizeWorkerUrl(CLOUDFLARE_WORKER_URL)}/classify-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, prompt: buildPrompt(productName) }),
    });
  } catch (error) {
    throw new Error(`Cloudflare Worker 연결 실패: ${error.message}`);
  }
  return parseClassificationResponse(response, `Cloudflare Worker 요청 실패 (HTTP ${response.status})`);
}

async function classifyDirect(productName) {
  if (!API_KEY) {
    throw new Error('브라우저 직접 호출용 Google API 키가 설정되어 있지 않습니다.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(productName) }] }] }),
    }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `분류 요청 실패 (HTTP ${response.status})`);
  }

  const parts = body?.candidates?.[0]?.content?.parts || [];
  const text = parts.find((part) => typeof part.text === 'string')?.text;
  return extractCategory(text);
}

// Best-effort: returns null (never throws) so callers can fall back to
// keyword matching without special-casing failures.
export async function classifyProductShapeCategory(productName) {
  try {
    const category = await classifyViaLocalApi(productName);
    if (category) return category;
  } catch (error) {
    console.warn('Same-origin product classification failed.', error);
  }

  if (CLOUDFLARE_WORKER_URL && !isPlaceholderWorkerUrl(CLOUDFLARE_WORKER_URL)) {
    try {
      const category = await classifyViaWorker(productName);
      if (category) return category;
    } catch (error) {
      console.warn('Cloudflare Worker product classification failed.', error);
    }
  }

  try {
    return await classifyDirect(productName);
  } catch (error) {
    console.warn('Direct Google API product classification failed.', error);
    return null;
  }
}
