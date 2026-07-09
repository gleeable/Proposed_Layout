const MESHY_BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function createTask(apiKey, imageDataUrl) {
  const response = await fetch(MESHY_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageDataUrl,
      should_remesh: true,
      should_texture: true,
      target_polycount: 10000,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.message || `Meshy 작업 생성 실패 (HTTP ${response.status})`);
  }

  if (!body?.result) {
    throw new Error('Meshy 응답에 작업 ID가 없습니다.');
  }

  return body.result;
}

async function getTaskStatus(apiKey, taskId) {
  const response = await fetch(`${MESHY_BASE}/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.message || `Meshy 상태 조회 실패 (HTTP ${response.status})`);
  }

  return {
    status: body.status,
    progress: body.progress ?? 0,
    modelUrl: body.model_urls?.glb || null,
    error: body.task_error?.message || null,
  };
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = env.MESHY_API_KEY || env.VITE_MESHY_API_KEY;

  if (!apiKey) {
    return json({ error: 'MESHY_API_KEY Cloudflare Pages secret is not set.' }, 500);
  }

  const { action, imageDataUrl, taskId } = await request.json().catch(() => ({}));

  try {
    if (action === 'create') {
      if (!imageDataUrl) return json({ error: 'imageDataUrl is required.' }, 400);
      const newTaskId = await createTask(apiKey, imageDataUrl);
      return json({ taskId: newTaskId });
    }

    if (action === 'status') {
      if (!taskId) return json({ error: 'taskId is required.' }, 400);
      const status = await getTaskStatus(apiKey, taskId);
      return json(status);
    }

    return json({ error: 'action must be "create" or "status".' }, 400);
  } catch (error) {
    return json({ error: error.message }, 502);
  }
}
