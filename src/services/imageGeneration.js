const MODEL = 'gemini-2.5-flash-image';
const API_KEY = import.meta.env.VITE_GOOGLE_AI_STUDIO_APIKEY;
const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

function buildPrompt(productName) {
  return `A clean, simple, flat-style product icon illustration of "${productName}", isolated on a plain white background, no shadows, no text, no watermark, minimal furniture/product catalog icon style, front or 3/4 view.`;
}

function normalizeWorkerUrl(workerUrl) {
  return workerUrl.replace(/\/$/, '');
}

async function generateProductImageViaWorker(productName) {
  const response = await fetch(`${normalizeWorkerUrl(CLOUDFLARE_WORKER_URL)}/generate-product-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productName,
      prompt: buildPrompt(productName),
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message || body?.error || `Cloudflare Worker 요청 실패 (HTTP ${response.status})`;
    throw new Error(message);
  }

  if (body?.imageDataUrl) {
    return body.imageDataUrl;
  }

  if (body?.mimeType && body?.data) {
    return `data:${body.mimeType};base64,${body.data}`;
  }

  throw new Error('Cloudflare Worker 응답에 이미지 데이터가 없습니다.');
}

async function generateProductImageDirect(productName) {
  if (!API_KEY) {
    throw new Error('VITE_CLOUDFLARE_WORKER_URL 또는 VITE_GOOGLE_AI_STUDIO_APIKEY가 설정되어 있지 않습니다.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(productName) }] }],
      }),
    }
  );

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

export async function generateProductImage(productName) {
  if (CLOUDFLARE_WORKER_URL) {
    return generateProductImageViaWorker(productName);
  }

  return generateProductImageDirect(productName);
}
