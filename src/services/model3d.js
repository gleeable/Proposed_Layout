const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

function normalizeWorkerUrl(workerUrl) {
  return workerUrl.replace(/\/$/, '');
}

function isPlaceholderWorkerUrl(workerUrl) {
  return workerUrl.includes('your-worker') || workerUrl.includes('your-subdomain');
}

async function callApi(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `요청 실패 (HTTP ${response.status})`);
  }
  return data;
}

async function pollTask(endpoint, taskId, onProgress) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const data = await callApi(endpoint, { action: 'status', taskId });
    onProgress?.(data.progress ?? 0, data.status);

    if (data.status === 'SUCCEEDED') {
      if (!data.modelUrl) throw new Error('3D 모델 URL을 받지 못했습니다.');
      return data.modelUrl;
    }
    if (data.status === 'FAILED' || data.status === 'CANCELED') {
      throw new Error(data.error || '3D 모델 생성에 실패했습니다.');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('3D 모델 생성 시간이 초과되었습니다.');
}

async function generateVia(endpoint, imageDataUrl, onProgress) {
  const { taskId } = await callApi(endpoint, { action: 'create', imageDataUrl });
  if (!taskId) throw new Error('작업 ID를 받지 못했습니다.');
  return pollTask(endpoint, taskId, onProgress);
}

export async function generateProduct3DModel(imageDataUrl, { onProgress } = {}) {
  let lastError = null;

  try {
    return await generateVia('/api/generate-product-3d', imageDataUrl, onProgress);
  } catch (error) {
    lastError = error;
    console.warn('Same-origin 3D generation API failed. Falling back to Cloudflare Worker.', error);
  }

  if (CLOUDFLARE_WORKER_URL && !isPlaceholderWorkerUrl(CLOUDFLARE_WORKER_URL)) {
    try {
      return await generateVia(
        `${normalizeWorkerUrl(CLOUDFLARE_WORKER_URL)}/generate-product-3d`,
        imageDataUrl,
        onProgress
      );
    } catch (error) {
      lastError = error;
      console.warn('Cloudflare Worker 3D generation failed.', error);
    }
  }

  throw lastError || new Error('3D 모델 생성 API를 사용할 수 없습니다.');
}
