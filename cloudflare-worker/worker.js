const MODEL = 'gemini-2.5-flash-image';
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

async function handleGenerateProductImage(request, env) {
  if (!env.GOOGLE_AI_STUDIO_APIKEY) {
    return json({ error: 'GOOGLE_AI_STUDIO_APIKEY Cloudflare secret is not set.' }, 500);
  }

  const { productName, prompt } = await request.json().catch(() => ({}));
  const textPrompt = prompt || productName;

  if (!textPrompt) {
    return json({ error: 'productName or prompt is required.' }, 400);
  }

  const googleResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GOOGLE_AI_STUDIO_APIKEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: textPrompt }] }],
      }),
    }
  );

  const googleBody = await googleResponse.json();

  if (!googleResponse.ok) {
    return json(
      { error: googleBody?.error?.message || `Google API request failed (${googleResponse.status})` },
      googleResponse.status
    );
  }

  const candidate = googleBody?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart) {
    const textPart = parts.find((part) => part.text)?.text;
    const reason = textPart || candidate?.finishReason || googleBody?.promptFeedback?.blockReason;
    const detail = reason ? `: ${reason}` : '.';
    return json({ error: `Google API response did not include image data${detail}` }, 502);
  }

  return json({
    mimeType: imagePart.inlineData.mimeType,
    data: imagePart.inlineData.data,
  });
}

async function createMeshyTask(apiKey, imageDataUrl) {
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

async function getMeshyTaskStatus(apiKey, taskId) {
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

async function handleGenerateProduct3d(request, env) {
  const apiKey = env.MESHY_API_KEY;
  if (!apiKey) {
    return json({ error: 'MESHY_API_KEY Cloudflare secret is not set.' }, 500);
  }

  const { action, imageDataUrl, taskId } = await request.json().catch(() => ({}));

  try {
    if (action === 'create') {
      if (!imageDataUrl) return json({ error: 'imageDataUrl is required.' }, 400);
      const newTaskId = await createMeshyTask(apiKey, imageDataUrl);
      return json({ taskId: newTaskId });
    }

    if (action === 'status') {
      if (!taskId) return json({ error: 'taskId is required.' }, 400);
      const status = await getMeshyTaskStatus(apiKey, taskId);
      return json(status);
    }

    return json({ error: 'action must be "create" or "status".' }, 400);
  } catch (error) {
    return json({ error: error.message }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }

    if (url.pathname === '/generate-product-image') {
      return handleGenerateProductImage(request, env);
    }

    if (url.pathname === '/generate-product-3d') {
      return handleGenerateProduct3d(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};
