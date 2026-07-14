// Categories the 3D view (Design3DView.jsx / ProductShape3D, via
// productShapeArchetypes3D.jsx) knows how to hand-draw. Single source of
// truth lives in src/domain/productShapeCatalog.js — the classification
// prompt below, the keyword fallback, and the render lookup all read from it.
import { PRODUCT_SHAPE_CATEGORIES } from '../domain/productShapeCatalog';

export { PRODUCT_SHAPE_CATEGORIES };

const MODEL = 'gemini-2.5-flash';
const API_KEY = import.meta.env.VITE_GOOGLE_AI_STUDIO_APIKEY;
const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

function buildPrompt(productName) {
  return `Classify the furniture/product named "${productName}" into exactly one of these categories: ${PRODUCT_SHAPE_CATEGORIES.join(', ')}. Reply with only the single category id in lowercase (categories may contain underscores, e.g. "drawer_chest" — reply with the full id), nothing else. Pick the single closest matching category even if imperfect; only reply "box" if truly nothing is remotely close.`;
}

function normalizeWorkerUrl(workerUrl) {
  return workerUrl.replace(/\/$/, '');
}

function isPlaceholderWorkerUrl(workerUrl) {
  return workerUrl.includes('your-worker') || workerUrl.includes('your-subdomain');
}

function extractCategory(text) {
  // Category ids can contain underscores (e.g. "drawer_chest") — [a-z]+
  // alone would stop at the first underscore and never match those.
  const match = (text || '').toLowerCase().match(/[a-z_]+/);
  const category = match?.[0]?.replace(/^_+|_+$/g, '');
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
