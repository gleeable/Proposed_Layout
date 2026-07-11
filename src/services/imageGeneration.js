const MODEL = 'gemini-2.5-flash-image';
const API_KEY = import.meta.env.VITE_GOOGLE_AI_STUDIO_APIKEY;
const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

function buildPrompt(productName) {
  return `A clean, simple, flat-style product icon illustration of "${productName}", isolated on a plain white background, no shadows, no text, no watermark, minimal furniture/product catalog icon style, front or 3/4 view.`;
}

function normalizeWorkerUrl(workerUrl) {
  return workerUrl.replace(/\/$/, '');
}

function isPlaceholderWorkerUrl(workerUrl) {
  return workerUrl.includes('your-worker') || workerUrl.includes('your-subdomain');
}

async function parseImageGenerationResponse(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message || body?.error || fallbackMessage;
    throw new Error(message);
  }

  if (body?.imageDataUrl) {
    return body.imageDataUrl;
  }

  if (body?.mimeType && body?.data) {
    return `data:${body.mimeType};base64,${body.data}`;
  }

  throw new Error('응답에 이미지 데이터가 없습니다.');
}

async function generateImageViaWorker(prompt) {
  let response;

  try {
    response = await fetch(`${normalizeWorkerUrl(CLOUDFLARE_WORKER_URL)}/generate-product-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch (error) {
    throw new Error(`Cloudflare Worker 연결 실패: ${error.message}`);
  }

  return parseImageGenerationResponse(response, `Cloudflare Worker 요청 실패 (HTTP ${response.status})`);
}

async function generateImageViaLocalApi(prompt) {
  let response;

  try {
    response = await fetch('/api/generate-product-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch (error) {
    throw new Error(`로컬 이미지 생성 API 연결 실패: ${error.message}`);
  }

  return parseImageGenerationResponse(response, `로컬 이미지 생성 요청 실패 (HTTP ${response.status})`);
}

async function generateImageDirect(prompt) {
  if (!API_KEY) {
    throw new Error('브라우저 직접 호출용 Google API 키가 설정되어 있지 않습니다.');
  }

  let response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  } catch (error) {
    throw new Error(`Google API 직접 연결 실패: ${error.message}`);
  }

  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message || `이미지 생성 요청 실패 (HTTP ${response.status})`;
    throw new Error(message);
  }

  const parts = body?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart) {
    throw new Error('응답에 이미지 데이터가 없습니다.');
  }

  const { mimeType, data } = imagePart.inlineData;
  return `data:${mimeType};base64,${data}`;
}

// Shared by product-icon generation and material-swatch generation (see
// materialGeneration.js) — same same-origin -> Cloudflare Worker -> direct
// Google API fallback chain, just with a caller-supplied prompt.
export async function generateImageFromPrompt(prompt) {
  let lastError = null;

  try {
    // Must be awaited here — without it, a rejection surfaces after this
    // try/catch has already returned the (still-pending) promise, skipping
    // the Worker/direct fallbacks below entirely.
    return await generateImageViaLocalApi(prompt);
  } catch (error) {
    lastError = error;
    console.warn('Same-origin image generation API failed. Falling back to Cloudflare Worker or direct Google API request.', error);
  }

  if (CLOUDFLARE_WORKER_URL && !isPlaceholderWorkerUrl(CLOUDFLARE_WORKER_URL)) {
    try {
      return await generateImageViaWorker(prompt);
    } catch (error) {
      lastError = error;
      console.warn('Cloudflare Worker image generation failed. Falling back to direct Google API request.', error);
    }
  }

  if (API_KEY) {
    return generateImageDirect(prompt);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('이미지 생성 API를 사용할 수 없습니다. Cloudflare Pages Function과 GOOGLE_AI_STUDIO_APIKEY 설정을 확인해주세요.');
}

export async function generateProductImage(productName) {
  return generateImageFromPrompt(buildPrompt(productName));
}
