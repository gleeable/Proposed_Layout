const MODEL = 'gemini-2.5-flash-image';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPrompt(productName) {
  return `A clean, simple, flat-style product icon illustration of "${productName}", isolated on a plain white background, no shadows, no text, no watermark, minimal furniture/product catalog icon style, front or 3/4 view.`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = env.GOOGLE_AI_STUDIO_APIKEY || env.VITE_GOOGLE_AI_STUDIO_APIKEY;

  if (!apiKey) {
    return json({ error: 'GOOGLE_AI_STUDIO_APIKEY Cloudflare Pages secret is not set.' }, 500);
  }

  const { productName, prompt } = await request.json().catch(() => ({}));
  const textPrompt = prompt || buildPrompt(productName);

  if (!textPrompt) {
    return json({ error: 'productName or prompt is required.' }, 400);
  }

  const googleResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
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
